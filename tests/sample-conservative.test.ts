import { runSample, ruleEngine } from '../src/engine/sample';
const base = { answers: [], locked: [], report: null };
it('preserves versions and numbered labelled observations', () => {
  const r = ruleEngine('1. Open settings\n2. Click save\nActual: Error on screen\nExpected: settings stay saved\nChrome 131.0.2 on Windows');
  expect(r.steps).toEqual(['Open settings.', 'Click save.']);
  expect(r.environment).toEqual(['Chrome 131.0.2 on Windows']);
  expect(r.expected).toBe('Settings stay saved.');
});
it('keeps gaps when clarifications are unknown', () => {
  const r = runSample({ ...base, notes: 'Click save. Error appears.', answers: [{ field: 'expected', question: 'Expected?', answer: 'not sure', answeredAt: 1 }] });
  expect(r.expected).toBe('');
  expect(r.missing_info.some((q) => q.field === 'expected')).toBe(true);
});
it('reports conflicting expected observations without silently choosing truth', () => {
  const answer = { field: 'expected' as const, question: 'Expected?', answer: 'blue', answeredAt: 1 };
  const conflict = runSample({ ...base, notes: 'Expected: red', answers: [answer] });
  expect(conflict.missing_info.some((q) => /Several expected/.test(q.question))).toBe(true);
  const same = runSample({ ...base, notes: 'Expected: blue.', answers: [answer] });
  expect(same.missing_info.some((q) => /Several expected/.test(q.question))).toBe(false);
});

it.each(['unknown', 'not tested', 'TBD', "don't know", '???'])('labelled %s stays missing', (value) => {
  const r = ruleEngine(`Click save\nActual: ${value}\nExpected result: ${value}`);
  expect(r.actual).toBe('');
  expect(r.expected).toBe('');
  expect(r.missing_info.map((q) => q.field)).toEqual(expect.arrayContaining(['actual', 'expected']));
});
it('labelled clarification unknowns do not overwrite a gap or create conflict', () => {
  const r = runSample({ ...base, notes: 'Click save\nExpected: unknown', answers: [{ field: 'expected', question: 'Expected?', answer: 'Expected: not recorded', answeredAt: 1 }] });
  expect(r.expected).toBe('');
  expect(r.missing_info.some((q) => /Several expected/.test(q.question))).toBe(false);
});
it('uses explicit result labels without putting the label in the result', () => {
  const r = ruleEngine('Open settings\nActual result: spinner remains\nExpected result: settings open');
  expect(r.actual).toBe('Spinner remains.');
  expect(r.expected).toBe('Settings open.');
});
