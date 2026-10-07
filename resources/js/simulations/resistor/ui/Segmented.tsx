import clsx from "clsx";

type Option = { value: string; label: string; disabled?: boolean; hint?: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

/** A labelled radio group styled as a pill switch. Keyboard: arrows and space. */
export default function Segmented({ label, value, options, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1 rounded-full border border-chalk/15 bg-board/60 p-1">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={option.disabled}
            title={option.hint}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const enabled = options.filter((o) => !o.disabled);
              const index = enabled.findIndex((o) => o.value === value);
              const next = enabled[(index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
              onChange(next.value);
              (event.currentTarget.parentElement?.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
            }}
            data-value={option.value}
            tabIndex={checked ? 0 : -1}
            className={clsx(
              "min-h-9 rounded-full px-4 text-[13px] font-semibold transition-colors",
              checked ? "bg-copper text-card" : "text-chalk/75 hover:text-chalk",
              option.disabled && "opacity-40",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
