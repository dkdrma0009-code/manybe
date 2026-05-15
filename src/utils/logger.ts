// Logging abstraction — silent in production, full output in development.
// Use makeLogger(tag) to create a namespaced logger for each module.
// Rules:
//   debug / info — only emitted when VERBOSE_LOGGING is true (dev only)
//   warn         — only emitted in __DEV__ builds
//   error        — always emitted (crash reporting hook point)

import { FEATURES } from '../config/featureFlags';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info:  (...args: unknown[]) => void;
  warn:  (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function makeLogger(tag: string): Logger {
  const prefix = `[${tag}]`;
  return {
    debug: (...args) => { if (FEATURES.VERBOSE_LOGGING) console.log(prefix, ...args); },
    info:  (...args) => { if (FEATURES.VERBOSE_LOGGING) console.log(prefix, ...args); },
    warn:  (...args) => { if (__DEV__) console.warn(prefix, ...args); },
    // error is always logged — hook this to Sentry / Crashlytics when ready
    error: (...args) => console.error(prefix, ...args),
  };
}

// Default app-level logger (use module-specific ones where possible)
export const logger = makeLogger('App');
