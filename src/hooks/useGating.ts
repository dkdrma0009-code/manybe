import { FEATURES } from '../config/featureFlags';
import { PREMIUM_FEATURE_META, type PremiumFeature } from '../types/subscription';
import { useSubscription } from './useSubscription';

export function useGating(feature: PremiumFeature): { isLocked: boolean } {
  const { tier } = useSubscription();
  if (!FEATURES.PAYWALL_ENABLED) return { isLocked: false };
  const meta = PREMIUM_FEATURE_META[feature];
  return { isLocked: meta.requiresPremium && tier === 'free' };
}
