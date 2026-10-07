import { useId, useState } from "react";
import clsx from "clsx";

import {
  Answer,
  Answers,
  bandsFor,
  Checkpoint,
  expectedFor,
  grade,
  parseTyped,
  PREFIXES,
  score as localScore,
} from "./lib/checkpoints";
import { LabConfig } from "./lib/config";
import { meterDisplay } from "./lib/meter";
import { BAND_COLORS, BAND_ROLES, BandColor, BandSet, formatAmps, formatOhms, formatVolts, readBands } from "./lib/resistor";
import BandPicker from "./ui/BandPicker";
import ResistorDrawing from "./ui/ResistorDrawing";

type Props = { config: LabConfig };

type Result = { score: number; max_score: number; percent: number; passed: boolean; pass_percent: number };

type Phase = "answering" | "sending" | "graded";

/**
 * The recorded part of the lab. Questions come from the server; the browser
 * grades them with lib/checkpoints for instant feedback, then posts the raw
 * answers. The server regrades and stores the attempt; the badge shown is the
 * server's verdict.
 */
export default function Checkpoints({ config }: Props) {
  const [token, setToken] = useState(config.token);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(config.checkpoints);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("answering");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<{ token: string; checkpoints: Checkpoint[] } | null>(null);

  const answered = checkpoints.filter((c) => answers[c.id] != null).length;
  const locked = phase !== "answering";

  const setAnswer = (id: string, answer: Answer | null) => setAnswers((current) => ({ ...current, [id]: answer }));

  const submit = async () => {
    setPhase("sending");
    setError(null);
    try {
      const response = await fetch(config.postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": config.csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({ token, answers, score: localScore(checkpoints, answers) }),
      });

      if (response.status === 419) throw new Error("Your session expired. Reload the page and sign in again; your answers on this page will be lost.");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? `The server said no (${response.status}). Try again.`);

      setResult(body.attempt as Result);
      setNext(body.next);
      setPhase("graded");
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== "Failed to fetch" ? caught.message : "No connection. Your answers are still here; try again when the signal is back.");
      setPhase("answering");
    }
  };

  const tryAgain = () => {
    if (!next) return;
    setToken(next.token);
    setCheckpoints(next.checkpoints);
    setAnswers({});
    setResult(null);
    setNext(null);
    setPhase("answering");
    document.getElementById("lab-checkpoints")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (checkpoints.length === 0) return null;

  return (
    <section id="lab-checkpoints" aria-labelledby="lab-checkpoints-title" className="scroll-mt-20 border-t border-chalk/10 bg-board px-5 py-10 md:px-12 md:py-14">
      <p className="font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">Recorded · pass mark {config.passPercent}%</p>
      <h3 id="lab-checkpoints-title" className="mt-2 text-[clamp(2rem,5vw,3.6rem)] leading-[0.9] font-black tracking-[-0.03em] text-chalk uppercase">
        Checkpoints
      </h3>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sage">
        {checkpoints.length} tasks, new every time you open the lab. Your result goes to your dashboard and your instructor.
      </p>

      <ol className="m-0 mt-8 grid list-none gap-4 p-0 lg:grid-cols-2">
        {checkpoints.map((checkpoint, index) => (
          <CheckpointCard
            key={`${token}-${checkpoint.id}`}
            index={index}
            checkpoint={checkpoint}
            answer={answers[checkpoint.id] ?? null}
            onAnswer={(answer) => setAnswer(checkpoint.id, answer)}
            locked={locked}
            graded={phase === "graded"}
          />
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4" aria-live="polite">
        {phase !== "graded" ? (
          <>
            <button
              type="button"
              onClick={submit}
              disabled={answered < checkpoints.length || phase === "sending"}
              className="min-h-14 rounded-full bg-copper px-8 text-[16px] font-black tracking-wide text-card uppercase hover:bg-copper-dk disabled:opacity-40"
            >
              {phase === "sending" ? "Checking…" : "Submit answers"}
            </button>
            <span className="text-[13px] text-sage">
              {answered} of {checkpoints.length} answered
            </span>
          </>
        ) : (
          result && (
            <>
              <span
                className={clsx(
                  "inline-flex min-h-14 items-center gap-3 rounded-full px-7 text-[18px] font-black tracking-wide uppercase",
                  result.passed ? "bg-pass text-card" : result.percent >= 40 ? "bg-caution text-card" : "bg-fail text-card",
                )}
              >
                {result.passed ? "Passed" : "Retake"}
                <span className="lab-readout text-[16px] font-semibold normal-case">
                  {result.score}/{result.max_score}
                </span>
              </span>
              <span className="text-[13px] text-sage">
                Saved. {result.passed ? "Your instructor can see it." : `You need ${result.pass_percent}% to pass.`}
              </span>
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
    </section>
  );
}

type CardProps = {
  index: number;
  checkpoint: Checkpoint;
  answer: Answer | null;
  onAnswer: (answer: Answer | null) => void;
  locked: boolean;
  graded: boolean;
};

function CheckpointCard({ index, checkpoint, answer, onAnswer, locked, graded }: CardProps) {
  const verdict = graded ? grade(checkpoint, answer) : null;

  return (
    <li
      className={clsx(
        "rounded-[1.75rem] border p-5 transition-colors",
        verdict === true && "border-pass-lt/60 bg-pass/10",
        verdict === false && "border-fail-lt/60 bg-fail/10",
        verdict === null && "border-chalk/12 bg-board-2",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">
          {String(index + 1).padStart(2, "0")} · {checkpoint.unit}
        </span>
        {graded && (
          <span className={clsx("rounded-full px-3 py-1 text-[11.5px] font-black uppercase", verdict ? "bg-pass text-card" : "bg-fail text-card")}>
            {verdict ? "Correct" : "Not yet"}
          </span>
        )}
      </div>
      <div className="mt-3 text-[14.5px] leading-relaxed text-chalk">
        <CheckpointBody checkpoint={checkpoint} answer={answer} onAnswer={onAnswer} locked={locked} />
      </div>
      {verdict === false && <p className="mt-3 text-[13px] text-fail-lt">{explain(checkpoint)}</p>}
    </li>
  );
}

function explain(checkpoint: Checkpoint): string {
  switch (checkpoint.type) {
    case "read": {
      const v = readBands(checkpoint.bands);
      return `It reads ${formatOhms(v.ohms)}${v.tolerance !== null ? ` ± ${v.tolerance}%` : ""}.`;
    }
    case "bands": {
      const set = bandsFor(checkpoint.ohms, checkpoint.tolerance);
      return set ? `One answer: ${set.map((c) => BAND_COLORS[c].label).join(", ")}.` : "";
    }
    case "role":
      return `It is band ${checkpoint.role + 1}.`;
    case "current":
      return `I = V ÷ R = ${checkpoint.volts} ÷ ${checkpoint.ohms} = ${formatAmps(expectedFor(checkpoint) as number)}.`;
    case "tolerance": {
      const v = readBands(checkpoint.bands);
      return `Good parts read ${formatOhms(v.min)} to ${formatOhms(v.max)}, so it is ${expectedFor(checkpoint) ? "within" : "outside"} tolerance.`;
    }
  }
}

type BodyProps = { checkpoint: Checkpoint; answer: Answer | null; onAnswer: (answer: Answer | null) => void; locked: boolean };

function CheckpointBody({ checkpoint, answer, onAnswer, locked }: BodyProps) {
  switch (checkpoint.type) {
    case "read":
      return (
        <>
          <p className="m-0">What is the value of this resistor?</p>
          <ResistorDrawing bands={checkpoint.bands} showLabels={false} className="mt-3 w-full max-w-[420px]" title="Resistor to read" />
          <NumberAnswer kind="ohms" disabled={locked} onValue={(v) => onAnswer(v === null ? null : { ohms: v })} label="Value" />
        </>
      );
    case "current":
      return (
        <>
          <p className="m-0">
            A {formatVolts(checkpoint.volts)} supply is across a {formatOhms(checkpoint.ohms)} resistor. What current flows?
          </p>
          <NumberAnswer kind="amps" disabled={locked} onValue={(v) => onAnswer(v === null ? null : { amps: v })} label="Current" />
        </>
      );
    case "bands":
      return <BandsAnswer checkpoint={checkpoint} locked={locked} onAnswer={onAnswer} />;
    case "role":
      return (
        <>
          <p className="m-0">
            On this part, which band is the <strong>{BAND_ROLES[checkpoint.role].title.toLowerCase()}</strong>?
          </p>
          <ResistorDrawing
            bands={checkpoint.bands}
            showLabels={false}
            picked={answer && "band" in answer ? answer.band : null}
            onPick={locked ? undefined : (band) => onAnswer({ band })}
            className="mt-3 w-full max-w-[420px]"
            title="Resistor; pick a band"
          />
          <Choice
            name={`role-${checkpoint.id}`}
            disabled={locked}
            value={answer && "band" in answer ? String(answer.band) : null}
            onChange={(v) => onAnswer({ band: Number(v) })}
            options={checkpoint.bands.map((color, i) => ({ value: String(i), label: `Band ${i + 1} (${BAND_COLORS[color].label})` }))}
          />
        </>
      );
    case "tolerance": {
      const display = meterDisplay(checkpoint.measured);
      const v = readBands(checkpoint.bands);
      return (
        <>
          <p className="m-0">You measure this part and the meter shows the reading below. Is the part within tolerance?</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ResistorDrawing bands={checkpoint.bands} className="w-full max-w-[300px]" title="Resistor under test" />
            <span className="lab-lcd inline-flex items-baseline gap-1.5 rounded-lg px-3 py-2 text-[22px]">
              {display.digits} <small className="text-[13px] font-semibold">{display.unit}</small>
            </span>
          </div>
          <p className="sr-only">
            Bands {checkpoint.bands.map((c) => BAND_COLORS[c].label).join(", ")}; meter reads {display.digits} {display.unit}. Printed tolerance {v.tolerance}%.
          </p>
          <Choice
            name={`tol-${checkpoint.id}`}
            disabled={locked}
            value={answer && "within" in answer ? String(answer.within) : null}
            onChange={(val) => onAnswer({ within: val === "true" })}
            options={[
              { value: "true", label: "Within tolerance, pass it" },
              { value: "false", label: "Outside tolerance, reject it" },
            ]}
          />
        </>
      );
    }
  }
}

function NumberAnswer({ kind, disabled, onValue, label }: { kind: "ohms" | "amps"; disabled: boolean; onValue: (value: number | null) => void; label: string }) {
  const [text, setText] = useState("");
  const [prefix, setPrefix] = useState(0);
  const options = PREFIXES[kind];
  const id = useId();
  const parsed = parseTyped(text);
  const invalid = text !== "" && Number.isNaN(parsed);

  const emit = (nextText: string, nextPrefix: number) => {
    const value = parseTyped(nextText);
    onValue(Number.isNaN(value) ? null : value * options[nextPrefix].factor);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-[13px] text-sage">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          emit(e.target.value, prefix);
        }}
        className="lab-readout min-h-11 w-32 rounded-xl border border-chalk/20 bg-board px-3 text-[16px] text-chalk outline-none focus:border-copper-lt"
      />
      <select
        aria-label={`${label} unit`}
        value={prefix}
        disabled={disabled}
        onChange={(e) => {
          setPrefix(Number(e.target.value));
          emit(text, Number(e.target.value));
        }}
        className="min-h-11 rounded-xl border border-chalk/20 bg-board px-3 text-[15px] text-chalk"
      >
        {options.map((option, i) => (
          <option key={option.label} value={i}>
            {option.label}
          </option>
        ))}
      </select>
      {invalid && <span className="text-[12.5px] text-caution-lt">Numbers only, e.g. 4.7</span>}
    </div>
  );
}

function Choice({
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-semibold",
            value === option.value ? "border-copper-lt bg-copper/20 text-chalk" : "border-chalk/15 text-sage hover:text-chalk",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            className="accent-copper"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function BandsAnswer({ checkpoint, locked, onAnswer }: { checkpoint: Extract<Checkpoint, { type: "bands" }>; locked: boolean; onAnswer: (answer: Answer | null) => void }) {
  const [bands, setBands] = useState<BandSet>(["brown", "black", "black", "gold"]);
  const [touched, setTouched] = useState(false);
  const value = readBands(bands);

  return (
    <>
      <p className="m-0">
        Paint the bands so the part reads{" "}
        <strong className="lab-readout">
          {formatOhms(checkpoint.ohms)} ± {checkpoint.tolerance}%
        </strong>
        .
      </p>
      <ResistorDrawing bands={bands} className="mt-3 w-full max-w-[420px]" title="Your resistor" />
      <p className="lab-readout m-0 mt-1 text-[13px] text-sage">
        Yours reads {formatOhms(value.ohms)} {value.tolerance !== null && `± ${value.tolerance}%`}
      </p>
      <fieldset disabled={locked} className="m-0 mt-3 border-0 p-0">
        <BandPicker
          compact
          idPrefix={`cp-${checkpoint.id}`}
          bands={bands}
          onChange={(index: number, color: BandColor) => {
            const nextBands = [...bands] as [BandColor, BandColor, BandColor, BandColor];
            nextBands[index] = color;
            setBands(nextBands);
            setTouched(true);
            onAnswer({ bands: nextBands });
          }}
        />
      </fieldset>
      {!touched && <p className="mt-2 text-[12.5px] text-sage">Change at least one band to answer.</p>}
    </>
  );
}
