// Radius scale — 4 semantic tiers + pill.
// Rule: sm for chips/badges, md for inputs, lg for cards, xl for sheets.
export const radius = {
  sm:   6,   // chips, tags, badges
  md:   10,  // inputs, small cards, buttons
  lg:   14,  // standard cards, list items
  xl:   18,  // feature cards, modals
  xxl:  24,  // large sheets, hero cards
  pill: 999,
} as const;
