/**
 * Landing page entry. Deliberately free of React and three.js: it decides
 * whether this device gets the live 3D hero, and only then fetches
 * ./hero/mountHero (React, the store, the stage, three.js) as a lazy chunk.
 * Phones, low-memory PCs, Save-Data and browsers without WebGL keep the static
 * hero that Blade rendered, and download none of that.
 *
 * A tiny inline script in the page makes a first guess before paint (so the
 * layout does not jump); this file confirms it with the full capability check.
 */

import { detectCapabilities } from "./lib/capabilities";
import { readConfig } from "./lib/config";

const PREFERENCE_KEY = "epas.landing.hero";

type HeroMode = "static" | "3d";

function savedPreference(): "3d" | "2d" | null {
  try {
    const value = window.localStorage.getItem(PREFERENCE_KEY);
    return value === "3d" || value === "2d" ? value : null;
  } catch {
    return null;
  }
}

function savePreference(value: "3d" | "2d"): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, value);
  } catch {
    // Storage can be blocked on a shared computer; the choice just will not stick.
  }
}

function init(section: HTMLElement, stage: HTMLElement): void {
  const caps = detectCapabilities();
  const header = document.getElementById("epas-header");
  const toggle = section.querySelector<HTMLButtonElement>("[data-hero-toggle]");
  let unmount: (() => void) | null = null;
  let starting = false;

  // The pin and the beats are sized from the sticky header's real height.
  const syncHeader = () => section.style.setProperty("--epas-hdr", `${header?.offsetHeight ?? 64}px`);
  syncHeader();
  window.addEventListener("resize", syncHeader, { passive: true });

  const show = (mode: HeroMode) => {
    section.dataset.heroMode = mode;
    if (!toggle) return;
    toggle.textContent = mode === "3d" ? "Switch to the light version" : "See it in 3D";
    toggle.setAttribute("aria-pressed", mode === "3d" ? "true" : "false");
  };

  const fallback = () => {
    unmount?.();
    unmount = null;
    show("static");
  };

  const start3d = async () => {
    if (unmount || starting) return;
    starting = true;
    show("3d");
    try {
      const { mountHero } = await import("./hero/mountHero");
      unmount = mountHero(stage, readConfig(stage), caps, fallback);
    } catch {
      fallback();
    } finally {
      starting = false;
    }
  };

  if (toggle) {
    toggle.hidden = !caps.webgl;
    toggle.addEventListener("click", () => {
      if (section.dataset.heroMode === "3d") {
        savePreference("2d");
        fallback();
        window.scrollTo({ top: Math.max(0, section.offsetTop - (header?.offsetHeight ?? 64)), behavior: "auto" });
      } else {
        savePreference("3d");
        void start3d();
      }
    });
  }

  const preference = savedPreference();
  const want3d = preference === "3d" ? caps.webgl : preference === "2d" ? false : caps.webgl && !caps.lowPower && !caps.compact;

  if (!want3d) {
    show("static");
    return;
  }

  show("3d");
  // Let the page paint and settle first; the hero is not needed to read it.
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, opts: { timeout: number }) => void }).requestIdleCallback;
  if (idle) {
    idle(() => void start3d(), { timeout: 1200 });
  } else {
    window.setTimeout(() => void start3d(), 300);
  }
}

const section = document.getElementById("epas-hero");
const stage = document.getElementById("epas-hero-stage");
if (section && stage) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(section, stage), { once: true });
  } else {
    init(section, stage);
  }
}
