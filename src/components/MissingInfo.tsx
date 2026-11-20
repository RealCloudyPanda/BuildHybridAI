import { useEffect, useState } from "react";
import type { Answer, Draft } from "../domain/types";
import { IconQuestion } from "./icons";

interface Props {
  draft: Draft;
  showExampleFill: boolean;
  exampleAnswers?: string[];
  running: boolean;
  onSubmit: (answers: Answer[]) => void;
}

export function MissingInfo({ draft, showExampleFill, exampleAnswers, running, onSubmit }: Props) {
  const questions = draft.report?.missing_info ?? [];
  const [values, setValues] = useState<string[]>(() => questions.map(() => ""));
  useEffect(() => setValues(questions.map(() => "")), [draft.id, draft.lastRun?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions.length && !draft.answers.length) return null;
  const filled = values.some((v) => v.trim());

  const submit = () => {
    const now = Date.now();
    const fresh: Answer[] = questions
      .map((q, i) => ({ question: q.question, field: q.field, answer: (values[i] ?? "").trim(), answeredAt: now }))
      .filter((a) => a.answer);
    const kept = draft.answers.filter((a) => !fresh.some((f) => f.question === a.question));
    onSubmit([...kept, ...fresh]);
  };

  return (
    <section className="missing" aria-labelledby="missing-h">
      {questions.length > 0 && (
        <>
          <h3 id="missing-h"><IconQuestion /> {questions.length === 1 ? "1 question" : `${questions.length} questions`} before this is reproducible</h3>
          <p>Your notes don't say these, so the report leaves them blank instead of guessing.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (filled && !running) submit();
            }}
          >
            {questions.map((q, i) => (
              <div className="q" key={q.question}>
                <label htmlFor={`q-${i}`}><span className="q-field">{q.field}</span>{q.question}</label>
                <input
                  id={`q-${i}`}
                  className="input"
                  value={values[i] ?? ""}
                  autoComplete="off"
                  onChange={(e) => setValues((vs) => vs.map((v, j) => (j === i ? e.target.value : v)))}
                />
              </div>
            ))}
            <div className="missing-actions">
              <button type="submit" className="btn btn-primary" disabled={!filled || running}>Update report</button>
              {showExampleFill && exampleAnswers && (
                <button type="button" className="link-btn" onClick={() => setValues(questions.map((_, i) => exampleAnswers[i] ?? ""))}>
                  Fill example answers
                </button>
              )}
            </div>
          </form>
        </>
      )}
      {draft.answers.length > 0 && (
        <details className="answered" open={questions.length === 0}>
          <summary>Answered ({draft.answers.length})</summary>
          <ul>
            {draft.answers.map((a) => (
              <li key={a.question}>{a.question} <b>{a.answer}</b></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
