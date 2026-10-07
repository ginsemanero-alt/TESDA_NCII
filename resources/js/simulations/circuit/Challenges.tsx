import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";

import { parseTyped } from "@/resistor/lib/checkpoints";
import { Challenge, EMPTY_DOC, HINTS, promptFor, sameDoc, TITLES, TYPED, UNITS } from "./lib/challenges";
import { BenchConfig } from "./lib/config";
import { ampsText, readingDisplay } from "./lib/format";
import { CircuitDoc } from "./lib/types";
import { useBench } from "./store";

type Typed = { text: string; unit: number; cause?: string };
type Result = { score: number; max_score: number; percent: number; passed: boolean; pass_percent: number };
type Phase = "working" | "sending" | "graded";

const box = "rounded-[1.75rem] border p-4 transition-colors";

/**
 * The recorded part. The server issues five challenges per visit; the student
 * works each one on the board (the same workbench as Free build, with that
 * challenge's starting circuit), types an answer where one is asked, and
 * submits once. The server re-solves every circuit and grades it; the browser
 * sends no score of its own.
 */
export default function Challenges({ config }: { config: BenchConfig }) {
  const [token, setToken] = useState(config.token);
  const [challenges, setChallenges] = useState<Challenge[]>(config.challenges);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState<Record<string, Typed>>({});
  const [phase, setPhase] = useState<Phase>("working");
  const [result, setResult] = useState<Result | null>(null);
  const [correct, setCorrect] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<{ token: string; checkpoints: Challenge[] } | null>(null);

  /** One working circuit per challenge, so switching between them loses nothing. */
  const work = useRef<Record<string, CircuitDoc>>({});
  const activeId = useRef(challenges[0]?.id ?? "");
  const load = useBench((s) => s.load);

  // Show a challenge's circuit on the board.
  const show = (index: number, list: Challenge[] = challenges) => {
    const challenge = list[index];
    if (!challenge) return;
    activeId.current = challenge.id;
    setActive(index);
    load(work.current[challenge.id] ?? challenge.doc ?? EMPTY_DOC);
  };

  useEffect(() => {
    show(0);
    // Remember every edit against the challenge being worked on.
    return useBench.subscribe((state, previous) => {
      if (state.doc !== previous.doc && activeId.current) work.current[activeId.current] = state.doc;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doc = useBench((s) => s.doc);
  const result_ = useBench((s) => s.result);

  const setField = (id: string, patch: Partial<Typed>) =>
    setTyped((current) => {
      const base: Typed = current[id] ?? { text: "", unit: 0 };
      return { ...current, [id]: { ...base, ...patch } };
    });

  /** Has the student given this challenge an answer yet (a typed value, a cause, or a changed circuit)? */
  const hasInput = (c: Challenge): boolean => {
    const t = typed[c.id];
    if (TYPED[c.type]) return t !== undefined && !Number.isNaN(parseTyped(t.text));
    if (c.type === "troubleshoot") return t?.cause !== undefined;
    return !sameDoc(work.current[c.id], c.doc);
  };
  // The board's doc is read above, so this panel re-renders on every edit and the count stays current.
  const answered = challenges.filter(hasInput).length;

  const submit = async () => {
    setPhase("sending");
    setError(null);

    const answers: Record<string, Record<string, unknown>> = {};
    for (const c of challenges) {
      const t = typed[c.id];
      const answer: Record<string, unknown> = {};
      if (c.doc) answer.doc = work.current[c.id] ?? c.doc;

      const spec = TYPED[c.type];
      if (spec && t) {
        const value = parseTyped(t.text);
        if (!Number.isNaN(value)) answer[spec.key] = value * UNITS[spec.units][t.unit].factor;
      }
      if (c.type === "troubleshoot" && t?.cause) answer.cause = t.cause;

      if (hasInput(c)) answers[c.id] = answer;
    }

    try {
      const response = await fetch(config.postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": config.csrfToken, "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ token, answers }),
      });
      if (response.status === 419) throw new Error("Your session expired. Reload the page and sign in again; the circuits on this page will be lost.");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? `The server said no (${response.status}). Try again.`);

      setResult(body.attempt as Result);
      setCorrect(Object.fromEntries((body.results as { id: string; correct: boolean }[]).map((r) => [r.id, r.correct])));
      setNext(body.next);
      setPhase("graded");
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== "Failed to fetch" ? caught.message : "No connection. Your circuits are still here; try again when the signal is back.");
      setPhase("working");
    }
  };

  const tryAgain = () => {
    if (!next) return;
    work.current = {};
    setToken(next.token);
    setChallenges(next.checkpoints);
    setTyped({});
    setResult(null);
    setCorrect({});
    setNext(null);
    setPhase("working");
    show(0, next.checkpoints);
    document.getElementById("circuit-challenges")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (challenges.length === 0) return null;

  const locked = phase !== "working";

  return (
    <section id="circuit-challenges" aria-labelledby="circuit-challenges-title" className="scroll-mt-20">
      <p className="m-0 font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">Recorded · pass mark {config.passPercent}%</p>
      <h3 id="circuit-challenges-title" className="m-0 mt-2 text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.92] font-black tracking-[-0.03em] text-chalk uppercase">
        Challenges
      </h3>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-relaxed text-sage">
        {challenges.length} tasks, new numbers every time. Each one loads its own circuit on the board above; work on it there, then submit everything at the bottom. The server checks what your circuits actually do.
      </p>

      <ol className="m-0 mt-6 grid list-none gap-3 p-0">
        {challenges.map((c, index) => (
          <Card
            key={`${token}-${c.id}`}
            index={index}
            challenge={c}
            isActive={active === index}
            typed={typed[c.id]}
            onField={(patch) => setField(c.id, patch)}
            onShow={() => show(index)}
            locked={locked}
            verdict={phase === "graded" ? correct[c.id] === true : null}
            live={active === index ? <Live challenge={c} /> : null}
          />
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-4" aria-live="polite">
        {phase !== "graded" ? (
          <>
            <button type="button" onClick={submit} disabled={answered === 0 || phase === "sending"} className="min-h-14 rounded-full bg-copper px-8 text-[16px] font-black tracking-wide text-card uppercase hover:bg-copper-dk disabled:opacity-40">
              {phase === "sending" ? "Checking…" : "Submit answers"}
            </button>
            <span className="text-[13px] text-sage">
              {answered} of {challenges.length} answered
            </span>
          </>
        ) : (
          result && (
            <>
              <span className={clsx("inline-flex min-h-14 items-center gap-3 rounded-full px-7 text-[18px] font-black tracking-wide uppercase", result.passed ? "bg-pass text-card" : result.percent >= 40 ? "bg-caution text-card" : "bg-fail text-card")}>
                {result.passed ? "Passed" : "Retake"}
                <span className="lab-readout text-[16px] font-semibold normal-case">
                  {result.score}/{result.max_score}
                </span>
              </span>
              <span className="text-[13px] text-sage">Saved. {result.passed ? "Your instructor can see it." : `You need ${result.pass_percent}% to pass.`}</span>
              <button type="button" onClick={tryAgain} className="min-h-12 rounded-full border border-chalk/25 px-6 text-[14px] font-bold text-chalk hover:border-copper-lt">
                Try a new set
              </button>
            </>
          )
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-fail/20 px-4 py-3 text-[13.5px] text-fail-lt">
          {error}
        </p>
      )}
      {/* Keeps the live readings above in step with the board. */}
      <span hidden>{result_.flags.length}</span>
    </section>
  );
}

type CardProps = {
  index: number;
  challenge: Challenge;
  isActive: boolean;
  typed?: Typed;
  onField: (patch: Partial<Typed>) => void;
  onShow: () => void;
  locked: boolean;
  verdict: boolean | null;
  live: React.ReactNode;
};

function Card({ index, challenge, isActive, typed, onField, onShow, locked, verdict, live }: CardProps) {
  const id = useId();
  const spec = TYPED[challenge.type];
  const value = typed?.text ?? "";
  const invalid = value !== "" && Number.isNaN(parseTyped(value));

  return (
    <li
      className={clsx(
        box,
        verdict === true && "border-pass-lt/60 bg-pass/10",
        verdict === false && "border-fail-lt/60 bg-fail/10",
        verdict === null && (isActive ? "border-copper-lt/70 bg-board-2" : "border-chalk/12 bg-board/60"),
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">
          {String(index + 1).padStart(2, "0")} · {challenge.unit} · {TITLES[challenge.type]}
        </span>
        <span className="flex items-center gap-2">
          {verdict !== null && <span className={clsx("rounded-full px-3 py-1 text-[11.5px] font-black uppercase", verdict ? "bg-pass text-card" : "bg-fail text-card")}>{verdict ? "Correct" : "Not yet"}</span>}
          {challenge.doc && !isActive && (
            <button type="button" onClick={onShow} className="min-h-9 rounded-full border border-chalk/20 px-4 text-[12.5px] font-semibold text-chalk hover:border-copper-lt">
              Open on the board
            </button>
          )}
          {challenge.doc && isActive && <span className="rounded-full bg-copper/25 px-3 py-1 text-[11.5px] font-bold text-copper-lt">On the board now</span>}
        </span>
      </div>

      <p className="m-0 mt-2 text-[14.5px] leading-relaxed text-chalk">{promptFor(challenge)}</p>
      {live}

      {spec && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="text-[13px] text-sage">
            {spec.label}
          </label>
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={locked}
            aria-invalid={invalid}
            onChange={(e) => onField({ text: e.target.value })}
            className="lab-readout min-h-11 w-32 rounded-xl border border-chalk/20 bg-board px-3 text-[16px] text-chalk outline-none focus:border-copper-lt"
          />
          <select aria-label={`${spec.label}, unit`} value={typed?.unit ?? 0} disabled={locked} onChange={(e) => onField({ unit: Number(e.target.value) })} className="min-h-11 rounded-xl border border-chalk/20 bg-board px-3 text-[15px] text-chalk">
            {UNITS[spec.units].map((u, i) => (
              <option key={u.label} value={i}>
                {u.label}
              </option>
            ))}
          </select>
          {invalid && <span className="text-[12.5px] text-caution-lt">Numbers only, e.g. 4.7</span>}
        </div>
      )}

      {challenge.type === "troubleshoot" && challenge.options && (
        <div role="radiogroup" aria-label="Most likely cause" className="mt-3 flex flex-wrap gap-2">
          {challenge.options.map((option) => (
            <label key={option.value} className={clsx("flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-semibold", typed?.cause === option.value ? "border-copper-lt bg-copper/20 text-chalk" : "border-chalk/15 text-sage hover:text-chalk")}>
              <input type="radio" name={`${id}-cause`} value={option.value} checked={typed?.cause === option.value} disabled={locked} onChange={() => onField({ cause: option.value })} className="accent-copper" />
              {option.label}
            </label>
          ))}
        </div>
      )}

      {verdict === false && <p className="m-0 mt-3 text-[13px] text-fail-lt">{HINTS[challenge.type]}</p>}
    </li>
  );
}

/** What the board is doing right now, for the challenge being worked on. Feedback, not grading. */
function Live({ challenge }: { challenge: Challenge }) {
  const result = useBench((s) => s.result);
  const doc = useBench((s) => s.doc);
  const meter = doc.parts.find((p) => p.type === "meter");
  const d = meter ? readingDisplay(meter.mode ?? "V", result.meters[meter.id]) : null;
  const led = result.elements["D1"];

  let text: string | null = null;
  if ((challenge.type === "build_led" || challenge.type === "troubleshoot") && led) {
    const lo = challenge.min ?? 0;
    const hi = challenge.max ?? 1;
    const ok = led.on && led.i >= lo && led.i <= hi;
    text = `LED current now: ${ampsText(led.i)}${led.on ? "" : " (not lit)"}. ${ok ? "In the right band." : `Aim for ${(lo * 1000).toFixed(0)} to ${(hi * 1000).toFixed(0)} mA.`}`;
  } else if (d && (challenge.type === "measure_voltage" || challenge.type === "measure_current" || challenge.type === "parallel")) {
    text = `Meter M1 shows: ${d.digits} ${d.unit}${d.note ? `. ${d.note}` : ""}`;
  }

  return text ? (
    <p className="lab-readout m-0 mt-2 rounded-xl bg-chalk/6 px-3 py-2 text-[12.5px] text-copper-lt" aria-live="polite">
      {text}
    </p>
  ) : null;
}
