import type { Draft } from './types';
/** Full equality token, kept local. No hash collisions or inference from timestamps. */
export function inputFingerprint(d: Pick<Draft, 'notes' | 'answers' | 'privacy' | 'privacyOverride' | 'locked' | 'report'>): string {
  return JSON.stringify([d.notes, d.answers, d.privacy, d.privacyOverride, d.locked, d.report]);
}
