/**
 * Entry for the resistor lab island. Deliberately small: it reads the config
 * Blade printed on the mount point and renders the lab. The 2D bench, the
 * chapters and the checkpoints are in this bundle; three.js and the 3D scene
 * are a separate chunk that App only imports when the device can run it.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { readConfig } from "./lib/config";

function mount(): void {
  document.querySelectorAll<HTMLElement>('[data-simulation-island][data-simulation="resistor-lab"]').forEach((element) => {
    if (element.dataset.mounted === "1") return;
    element.dataset.mounted = "1";

    createRoot(element).render(
      <StrictMode>
        <App config={readConfig(element)} />
      </StrictMode>,
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
