import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { MonetizationAnalytics } from './MonetizationAnalytics';
import {
  DEFAULT_SUB_STATE, PRODUCT_IDS, RC_ENTITLEMENT,
  SUB_CACHE_KEY, SUB_CACHE_TTL_MS,
  type SubscriptionState, type Product,
} from '../types/subscription';
import { Platform } from 'react-native';

// Minimal shape of the RevenueCat SDK we depend on — avoids importing the
// uninstalled package's types while keeping full type safety on our call sites.
interface RCOffering { availablePackages: RCPackage[] }
interface RCPackage { storeProduct: RCProduct }
interface RCProduct {
  identifier: string; priceString: string; price: number;
  currencyCode: string;
}
interface RCEntitlement {
  expirationDate: string | null; productIdentifier: string;
}
interface RCCustomerInfo {
  entitlements: { active: Record<string, RCEntitlement> };
}
interface RCSDK {
  configure(opts: { apiKey: string }): Promise<void>;
  getCustomerInfo(): Promise<RCCustomerInfo>;
  getOfferings(): Promise<{ current: RCOffering | null }>;
  purchasePackage(pkg: RCPackage): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
}

// Dynamic require: compiles even when react-native-purchases is not installed.
// Returns null if the native module is absent (Expo Go, missing pod install, etc.)
function getRC(): RCSDK | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    return (mod.default ?? mod) as RCSDK;
  } catch {
    return null;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initRevenueCat(): Promise<void> {
  const RC = getRC();
  if (!RC) return;

  const key = Platform.OS === 'ios' ? ENV.REVENUECAT_IOS_KEY : ENV.REVENUECAT_ANDROID_KEY;
  if (!key) return;

  await RC.configure({ apiKey: key });
}

// ─── State ────────────────────────────────────────────────────────────────────

export async function loadCachedState(): Promise<SubscriptionState> {
  try {
    const raw = await AsyncStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return DEFAULT_SUB_STATE;
    const state: SubscriptionState = JSON.parse(raw);
    const age = Date.now() - new Date(state.cachedAt).getTime();
    if (age > SUB_CACHE_TTL_MS) return DEFAULT_SUB_STATE;
    return state;
  } catch {
    return DEFAULT_SUB_STATE;
  }
}

export async function saveState(state: SubscriptionState): Promise<void> {
  try {
    await AsyncStorage.setItem(SUB_CACHE_KEY, JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

export async function fetchCurrentState(): Promise<SubscriptionState> {
  const RC = getRC();
  const now = new Date().toISOString();

  if (!RC) {
    return { ...DEFAULT_SUB_STATE, cachedAt: now };
  }

  try {
    const info = await RC.getCustomerInfo();
    const entitlement = info.entitlements.active[RC_ENTITLEMENT];
    if (entitlement) {
      const state: SubscriptionState = {
        tier: 'premium',
        expiresAt: entitlement.expirationDate ?? null,
        productId: entitlement.productIdentifier,
        cachedAt: now,
      };
      await saveState(state);
      return state;
    }
  } catch {
    // fall through to free
  }

  const state: SubscriptionState = { ...DEFAULT_SUB_STATE, cachedAt: now };
  await saveState(state);
  return state;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const RC = getRC();
  if (!RC) return getFallbackProducts();

  try {
    const offerings = await RC.getOfferings();
    const current = offerings.current;
    if (!current) return getFallbackProducts();

    return current.availablePackages.map((pkg) => {
      const p = pkg.storeProduct;
      const isAnnual = p.identifier.includes('annual');
      return {
        identifier: p.identifier,
        title: isAnnual ? 'MANYBE Pro 연간' : 'MANYBE Pro 월간',
        description: isAnnual ? '연간 구독 (33% 절약)' : '월간 구독',
        priceString: p.priceString,
        price: p.price,
        currencyCode: p.currencyCode,
        period: isAnnual ? 'annual' : 'monthly',
      } satisfies Product;
    });
  } catch {
    return getFallbackProducts();
  }
}

function getFallbackProducts(): Product[] {
  return [
    {
      identifier: PRODUCT_IDS.MONTHLY,
      title: 'MANYBE Pro 월간',
      description: '월간 구독',
      priceString: '₩9,900',
      price: 9900,
      currencyCode: 'KRW',
      period: 'monthly',
    },
    {
      identifier: PRODUCT_IDS.ANNUAL,
      title: 'MANYBE Pro 연간',
      description: '연간 구독 (33% 절약)',
      priceString: '₩79,000',
      price: 79000,
      currencyCode: 'KRW',
      period: 'annual',
    },
  ];
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { success: true;  state: SubscriptionState }
  | { success: false; cancelled: boolean; error?: string };

export async function purchase(productId: string): Promise<PurchaseResult> {
  const RC = getRC();
  if (!RC) {
    return { success: false, cancelled: false, error: '결제 모듈을 불러올 수 없습니다.' };
  }

  try {
    const offerings = await RC.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.storeProduct.identifier === productId,
    );
    if (!pkg) {
      return { success: false, cancelled: false, error: '상품을 찾을 수 없습니다.' };
    }

    await RC.purchasePackage(pkg);
    const state = await fetchCurrentState();
    MonetizationAnalytics.purchaseCompleted(productId);
    return { success: true, state };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // RevenueCat throws an error with userCancelled property
    const cancelled = typeof e === 'object' && e !== null && 'userCancelled' in e
      ? Boolean((e as { userCancelled?: boolean }).userCancelled)
      : false;

    if (!cancelled) MonetizationAnalytics.purchaseFailed(productId, msg);
    return { success: false, cancelled, error: cancelled ? undefined : msg };
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<SubscriptionState> {
  const RC = getRC();
  if (!RC) return DEFAULT_SUB_STATE;

  try {
    await RC.restorePurchases();
    const state = await fetchCurrentState();
    MonetizationAnalytics.restoreCompleted();
    return state;
  } catch {
    return DEFAULT_SUB_STATE;
  }
}
