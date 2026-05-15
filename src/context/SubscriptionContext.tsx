import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  initRevenueCat, loadCachedState, fetchCurrentState, getProducts, purchase, restorePurchases,
  type PurchaseResult,
} from '../services/SubscriptionService';
import type { Product, SubscriptionState, SubscriptionTier } from '../types/subscription';
import { DEFAULT_SUB_STATE } from '../types/subscription';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  state: SubscriptionState;
  products: Product[];
  loading: boolean;
  purchasing: boolean;
  purchase: (productId: string) => Promise<PurchaseResult>;
  restore:  () => Promise<void>;
  refresh:  () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: React.ReactNode;
}) {
  const [state,      setState]      = useState<SubscriptionState>(DEFAULT_SUB_STATE);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const init = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    // Load cached state immediately so UI doesn't flash
    const cached = await loadCachedState();
    setState(cached);
    // Then init RC and fetch fresh state + products in parallel
    await initRevenueCat();
    const [fresh, prods] = await Promise.all([fetchCurrentState(), getProducts()]);
    setState(fresh);
    setProducts(prods);
    setLoading(false);
  }, [userId]);

  useEffect(() => { init(); }, [init]);

  const handlePurchase = useCallback(async (productId: string): Promise<PurchaseResult> => {
    setPurchasing(true);
    const result = await purchase(productId);
    if (result.success) setState(result.state);
    setPurchasing(false);
    return result;
  }, []);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    const fresh = await restorePurchases();
    setState(fresh);
    setPurchasing(false);
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await fetchCurrentState();
    setState(fresh);
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      tier:      state.tier,
      state,
      products,
      loading,
      purchasing,
      purchase:  handlePurchase,
      restore:   handleRestore,
      refresh,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptionContext must be inside SubscriptionProvider');
  return ctx;
}
