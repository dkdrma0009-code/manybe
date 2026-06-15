import { useState, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './useAuth';
import { computePortfolioIntelligence } from '../services/PortfolioIntelligence';
import { generateMediaKitIntelligence } from '../services/MediaKitGenerator';
import type { MediaKitIntelligence, BadgeId, MediaKitTheme, SectionId, HighlightSection } from '../types/mediaKit';
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
  highlights: HighlightSection[];
}

interface UseMediaKitResult {
  kitData: MediaKitData | null;
  intelligence: MediaKitIntelligence | null;
  loading: boolean;
  generating: boolean;
  load: () => Promise<MediaKitData | null>;
  generate: (kit?: MediaKitData | null) => Promise<MediaKitIntelligence | null>;
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
  highlights: [],
};

export function useMediaKit(): UseMediaKitResult {
  const { user } = useAuth();
  const [kitData, setKitData] = useState<MediaKitData | null>(null);
  const [intelligence, setIntelligence] = useState<MediaKitIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (): Promise<MediaKitData | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('media_kits')
        .select('bio, pricing, past_brands, slug, is_form_enabled, badges, theme, section_order, highlights')
        .eq('user_id', user.id)
        .limit(1);
      const kit = data?.[0];
      const loaded: MediaKitData = {
        bio: kit?.bio ?? '',
        pricing: (kit?.pricing ?? {}) as Record<string, number>,
        pastBrands: (kit?.past_brands ?? []) as string[],
        slug: kit?.slug ?? '',
        isFormEnabled: kit?.is_form_enabled ?? false,
        badges: (kit?.badges ?? []) as BadgeId[],
        theme: (kit?.theme ?? 'indigo') as MediaKitTheme,
        sectionOrder: (kit?.section_order ?? DEFAULT_SECTION_ORDER) as SectionId[],
        highlights: (kit?.highlights ?? []) as unknown as HighlightSection[],
      };
      setKitData(loaded);
      return loaded;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // kit 파라미터를 받으면 그것을 사용 — load() 직후 stale state 문제 회피
  const generate = useCallback(async (kit?: MediaKitData | null): Promise<MediaKitIntelligence | null> => {
    if (!user) return null;
    setGenerating(true);
    try {
      const source = kit ?? kitData ?? EMPTY_KIT;
      const portfolio = await computePortfolioIntelligence(user.id, source.pastBrands);
      const intel = await generateMediaKitIntelligence(portfolio);
      setIntelligence(intel);
      return intel;
    } finally {
      setGenerating(false);
    }
  }, [user, kitData]);

  return { kitData, intelligence, loading, generating, load, generate };
}
