export type CreatorNiche =
  | 'beauty' | 'lifestyle' | 'tech' | 'food' | 'travel'
  | 'fitness' | 'gaming' | 'education' | 'finance' | 'general';

export interface CreatorBadge {
  type: 'deal_count' | 'reliability' | 'scale' | 'niche_expert';
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

export interface PortfolioIntelligence {
  topBrands: string[];
  reliabilityScore: number;   // 0-100
  nicheKeywords: string[];
  primaryNiche: CreatorNiche;
  dealCount: number;
  settledCount: number;
  completionRate: number;     // 0-100
}

export interface CollaborationPitch {
  short: string;   // ~80 chars for DM/SNS
  long: string;    // ~250 chars for email
  generatedAt: string;
}

export interface MediaKitIntelligence {
  portfolio: PortfolioIntelligence;
  pitch: CollaborationPitch;
  badges: CreatorBadge[];
  aiGeneratedBio: string;
  generatedAt: string;
}
