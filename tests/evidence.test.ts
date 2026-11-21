import { evidenceFor } from '../src/domain/evidence';
import { newDraft } from '../src/store/drafts';
import { emptyReport } from '../src/domain/report';
it('separates literal support tester confirmation and review', () => {
  const d = { ...newDraft(), notes: 'Click save. Error appears.', report: { ...emptyReport(), steps: ['Click save.'], actual: 'Server crashed', expected: 'Saved' }, locked: ['expected' as const] };
  const e = evidenceFor(d);
  expect(e.find((r) => r.field === 'steps')?.status).toBe('source match');
  expect(e.find((r) => r.field === 'actual')?.status).toBe('needs review');
  expect(e.find((r) => r.field === 'expected')?.status).toBe('tester confirmed');
});
it('does not turn punctuation-only text into support', () => {
  const d = { ...newDraft(), notes: 'Anything', report: { ...emptyReport(), actual: '...' } };
  expect(evidenceFor(d)[0].status).toBe('needs review');
});
