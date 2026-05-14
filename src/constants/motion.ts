// Motion timing constants for MANYBE
// Principle: calm momentum — interactions confirm, never distract.
export const motion = {
  // Micro-feedback: button press, badge appear, icon swap
  micro: 150,
  // State transitions: status pill, card highlight, input focus
  state: 240,
  // Pipeline progression: stage advance confirmation
  stage: 320,
  // Modal entrance / screen transitions
  modal: 300,
  // Success confirmations
  success: 1400,
} as const;
