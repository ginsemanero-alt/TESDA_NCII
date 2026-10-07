/**
 * Entry for the circuit workbench island. It reads the config Blade printed on
 * the mount point and renders the workbench. Everything is plain React and SVG:
 * there is no WebGL and no large download, so it runs on the same low-end
 * school PCs and phones as the rest of the platform.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { readConfig } from "./lib/config";

function mount(): void {
  document.querySelectorAll<HTMLElement>('[data-simulation-island][data-simulation="circuit-sandbox"]').forEach((element) => {
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
