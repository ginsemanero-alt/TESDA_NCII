import clsx from "clsx";

import { ALLOWED_COLORS, BAND_COLORS, BAND_ROLES, BandColor, bandContribution, METALLIC_BANDS } from "@/resistor/lib/resistor";

type Props = {
  bands: readonly BandColor[];
  onChange: (index: number, color: BandColor) => void;
  /** Band to emphasise, e.g. the one hovered on the model. */
  highlight?: number | null;
  idPrefix: string;
  compact?: boolean;
};

export function swatchClass(color: BandColor): string | undefined {
  if (!METALLIC_BANDS.has(color)) return undefined;
  return color === "gold" ? "lab-swatch--gold" : "lab-swatch--silver";
}

/**
 * Four radio groups, one per band, limited to the colours that band can carry.
 * Native radios, so arrow keys, Tab and screen readers work without extra code;
 * every swatch carries its colour name as text, not colour alone.
 */
export default function BandPicker({ bands, onChange, highlight = null, idPrefix, compact = false }: Props) {
  return (
    <div className={clsx("grid", compact ? "gap-3" : "gap-4")}>
      {bands.map((color, index) => (
        <fieldset key={index} className={clsx("m-0 min-w-0 border-0 p-0", highlight === index && "rounded-xl bg-chalk/5 ring-1 ring-copper/60")}>
          <legend className="flex w-full items-baseline justify-between gap-3 p-0 text-[13px]">
            <span className={clsx("font-semibold", highlight === index ? "text-copper-lt" : "text-chalk")}>
              Band {index + 1} · {BAND_ROLES[index].title}
            </span>
            <span className="lab-readout text-[13px] text-chalk/85">
              {BAND_COLORS[color].label} · {bandContribution(index, color)}
            </span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALLOWED_COLORS[index].map((option) => {
              const id = `${idPrefix}-b${index}-${option}`;
              const checked = option === color;
              return (
                <span key={option} className="relative">
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-band-${index}`}
                    value={option}
                    checked={checked}
                    onChange={() => onChange(index, option)}
                    className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                  />
                  <label
                    htmlFor={id}
                    title={BAND_COLORS[option].label}
                    className={clsx(
                      "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border pr-2.5 pl-1 text-[11.5px] font-semibold transition-colors",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-copper-lt",
                      checked ? "border-copper-lt bg-chalk/10 text-chalk" : "border-chalk/15 text-sage hover:border-chalk/40 hover:text-chalk",
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx("size-6 rounded-full ring-1 ring-black/40", swatchClass(option))}
                      style={{ backgroundColor: BAND_COLORS[option].hex }}
                    />
                    {BAND_COLORS[option].label}
                  </label>
                </span>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
