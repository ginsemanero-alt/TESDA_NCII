import { Checkpoint } from "./checkpoints";

/** Everything the Blade partial hands the island through data-* attributes. */
export interface LabConfig {
  simulation: string;
  title: string;
  token: string;
  checkpoints: Checkpoint[];
  postUrl: string;
  modulePageId: number | null;
  /** Absolute base URL of /public/simulations/resistor, no trailing slash. */
  assets: string;
  passPercent: number;
  csrfToken: string;
}

export function readConfig(element: HTMLElement): LabConfig {
  const data = element.dataset;
  let checkpoints: Checkpoint[] = [];
  try {
    checkpoints = JSON.parse(data.checkpoints ?? "[]") as Checkpoint[];
  } catch {
    checkpoints = [];
  }

  return {
    simulation: data.simulation ?? "resistor-lab",
    title: data.title ?? "Resistor lab",
    token: data.token ?? "",
    checkpoints,
    postUrl: data.postUrl ?? "",
    modulePageId: data.modulePage ? Number(data.modulePage) : null,
    assets: (data.assets ?? "/simulations/resistor").replace(/\/$/, ""),
    passPercent: Number(data.passPercent ?? 75),
    csrfToken: document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "",
  };
}

export function assetUrl(config: LabConfig, path: string): string {
  return `${config.assets}/${path}`;
}
