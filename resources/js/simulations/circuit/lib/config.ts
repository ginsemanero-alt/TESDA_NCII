import { Challenge } from "./challenges";

/** What the Blade partial hands the island through data-* attributes. */
export interface BenchConfig {
  simulation: string;
  title: string;
  token: string;
  challenges: Challenge[];
  postUrl: string;
  modulePageId: number | null;
  passPercent: number;
  csrfToken: string;
}

export function readConfig(element: HTMLElement): BenchConfig {
  const data = element.dataset;
  let challenges: Challenge[] = [];
  try {
    challenges = JSON.parse(data.checkpoints ?? "[]") as Challenge[];
  } catch {
    challenges = [];
  }

  return {
    simulation: data.simulation ?? "circuit-sandbox",
    title: data.title ?? "Circuit workbench",
    token: data.token ?? "",
    challenges,
    postUrl: data.postUrl ?? "",
    modulePageId: data.modulePage ? Number(data.modulePage) : null,
    passPercent: Number(data.passPercent ?? 75),
    csrfToken: document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "",
  };
}
