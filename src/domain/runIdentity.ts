import type { Draft } from './types';

export function inputFingerprint(d: Pick<Draft, 'notes' | 'answers' | 'privacy' | 'privacyOverride' | 'locked' | 'report'>): string {
  return JSON.stringify([d.notes, d.answers, d.privacy, d.privacyOverride, d.locked, d.report]);
}
