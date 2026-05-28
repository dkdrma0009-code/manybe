import { useState, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './useAuth';
import { computePortfolioIntelligence } from '../services/PortfolioIntelligence';
import { generateMediaKitIntelligence } from '../services/MediaKitGenerator';
import type { MediaKitIntelligence, BadgeId, MediaKitTheme, SectionId } from '../types/mediaKit';
import { DEFAULT_SECTION_ORDER } from '../types/mediaKit';

export interface MediaKitData {
  bio: string;
  pricing: Record<string, number>;
  pastBrands: string[];
  slug: string;
  isFormEnabled: boolean;
  badges: BadgeId[];
  theme: MediaKitTheme;
  sectionOrder: SectionId[];
}

interface UseMediaKitResult {
  kitData: MediaKitData | null;
  intelligence: MediaKitIntelligence | null;
  loading: boolean;
  generating: boolean;
  load: () => Promise<void>;
  generate: () => Promise<MediaKitIntelligence | null>;
}

const EMPTY_KIT: MediaKitData = {
  bio: '',
  pricing: {},
  pastBrands: [],
  slug: '',
  isFormEnabled: false,
  badges: [],
  theme: 'indigo',
  sectionOrder: DEFAULT_SECTION_ORDER,
};

export function useMediaKit(): UseMediaKitResult {
  const { user } = useAuth();
  const [kitData, setKitData] = useState<MediaKitData | null>(null);
  const [intelligence, setIntelligence] = useState<MediaKitIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('media_kits')
        .select('bio, pricing, past_brands, slug, is_form_enabled, badges, theme, section_order')
        .eq('user_id', user.id)
        .limit(1);
      const kit = data?.[0];
      setKitData({
        bio: kit?.bio ?? '',
        pricing: kit?.pricing ?? {},
        pastBrands: kit?.past_brands ?? [],
        slug: kit?.slug ?? '',
        isFormEnabled: kit?.is_form_enabled ?? false,
        badges: (kit?.badges ?? []) as BadgeId[],
        theme: (kit?.theme ?? 'indigo') as MediaKitTheme,
        sectionOrder: (kit?.section_order ?? DEFAULT_SECTION_ORDER) as SectionId[],
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generate = useCallback(async (): Promise<MediaKitIntelligence | null> => {
    if (!user) return null;
    setGenerating(true);
    try {
      const kit = kitData ?? EMPTY_KIT;
      const portfolio = await computePortfolioIntelligence(user.id, kit.pastBrands);
      const intel = await generateMediaKitIntelligence(portfolio);
      setIntelligence(intel);
      return intel;
    } finally {
      setGenerating(false);
    }
  }, [user, kitData]);

  return { kitData, intelligence, loading, generating, load, generate };
}
