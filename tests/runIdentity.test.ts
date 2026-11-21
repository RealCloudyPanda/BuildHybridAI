import { inputFingerprint } from '../src/domain/runIdentity';
import { newDraft } from '../src/store/drafts';
it('ignores bookkeeping but invalidates changes to all run inputs', () => {
  const d = newDraft(); const identity = inputFingerprint(d);
  expect(inputFingerprint({ ...d, updatedAt: 999 } as typeof d)).toBe(identity);
  for (const change of [{ notes: 'edited' }, { privacy: 'local-only' as const }, { locked: ['title' as const] }, { privacyOverride: true }, { answers: [{ field: 'actual' as const, question: '?', answer: 'different', answeredAt: 1 }] }]) expect(inputFingerprint({ ...d, ...change })).not.toBe(identity);
});
