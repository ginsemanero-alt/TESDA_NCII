# Simulations

The Simulation feature of the EPAS NC II platform (paper objective 1.a.iv,
Student interface: "Simulation"). The first simulation is the **Resistor lab**,
ported from the `resistor-3d` prototype into this Laravel app as a React
island.

## How it fits together

```
Blade page ──includes── partials/simulation-island.blade.php
   │                       mount div + data-* (token, checkpoints, post URL)
   │                       @vite(labs.css, <lab>/index.tsx)  ← only on pages with a lab
   ▼
React island (resources/js/simulations/resistor/)
   index.tsx → App.tsx
     ├─ chapters/*      lesson copy, keyed to TR units          (always loaded)
     ├─ bench2d/        light SVG stage, no WebGL               (always loaded)
     ├─ Checkpoints.tsx questions from the server, local feedback (always loaded)
     └─ three/Stage3D   three.js + R3F bench                    (lazy chunk, 3D only)
   │
   │ POST {token, answers, score}  (CSRF, same session)
   ▼
Student\SimulationController@storeAttempt
   AttemptTokens   → the checkpoints this student was actually given
   ResistorLab     → regrades the raw answers with ColorCode (PHP twin of resistor.ts)
   score mismatch  → 422, nothing stored
   simulation_attempts row, ActivityLog entry, ModuleProgress advanced on pass
```

Where it shows up:

| Who | Where |
| --- | --- |
| Student | **Simulations** in the top nav (and **Labs** in the phone bottom bar), `/student/simulations`; any lesson page an instructor set to *Simulation*; a *Simulation lab* card on the dashboard with the last result |
| Instructor | *Page type → Simulation* when adding or editing a lesson page; **Lab** column (best attempt) on *Classes* |
| Activity log | "Resistor lab: 4 of 5 checkpoints, passed" per attempt |

## The landing page hero

The public front page (`/`) opens with a live preview of the same 3D bench, so a
visitor sees the real resistor before signing in. It is public and read-only:
no checkpoints, no scores, no progress, no API calls. Everything the lab records
stays behind login.

```
landing.blade.php   the hero copy is plain HTML: headline, buttons and six scroll beats
   │                (intro · four bands · measure · circuit), plus a static circuit diagram
   │  inline script  first guess before paint (wide screen and not Save-Data / low memory ⇒ 3D)
   ▼
landing.ts          about 1 KB, no React, no three.js. Confirms with the full capability check
   │                (WebGL, memory, Save-Data, screen); if 3D: import('./hero/mountHero')
   ▼
hero/mountHero      React + the lab's own Realistic scene, full bleed, pinned under the header.
                    The beats scroll over it and drive the camera (useBeatTracking → CameraRig).
```

| Device | What the visitor gets | What is downloaded |
| --- | --- | --- |
| Laptop or desktop, WebGL, enough memory | Live 3D hero; the part floats, the camera glides along the bands, the meter reads, the circuit powers up | Landing entry (≈ 1 KB), then React and three.js (≈ 0.4 MB gzip), the 168 KB model and the 1.1 MB HDRI |
| Phone, tablet, 2-core or low-memory PC, Save-Data, no WebGL, JavaScript off | The static hero: copy and the circuit diagram with the practice question | Landing entry only (none of the 3D code) |
| Phone or tablet that wants it | **See it in 3D** under the buttons opts in; **Switch to the light version** goes back. The choice is remembered on that device | As the 3D row, only after the tap |

Reduced motion: the part holds still instead of floating, and the camera cuts to
each beat instead of gliding. If 3D fails to start for any reason, the page drops
back to the static hero.

Layout: from 900 px wide in landscape the copy sits left and the part is pushed
right; otherwise the copy card sits under the part. `HERO` in
`lib/experience.ts` holds the breakpoint, the offsets and the camera fit,
`landing.blade.php` repeats the breakpoint in its CSS, and `npm run check:framing`
verifies the part is in frame and clear of the copy at 11 hero sizes.

The page asks Vite for the hero only if the build contains it. With no build,
or a build that predates the hero, the front page simply stays static instead of
failing.

## Adding a second simulation

Say a capacitor lab, `capacitor-lab`.

1. **Server side.** Create `app/Simulations/Capacitor/CapacitorLab.php`
   implementing `App\Simulations\Simulation`:
   - `key()`, `title()`, `summary()`, `units()` (TR code ⇒ title) and `entry()` (the Vite entry);
   - `checkpoints()` returns fresh parameters with **no answers** in them;
   - `grade()` recomputes each answer from those parameters and returns `null` for malformed input.

   Register the class in `SimulationRegistry::CLASSES`. The instructor's page
   type list, the routes and the attempt endpoint pick it up from there.
2. **Client side.** Create `resources/js/simulations/capacitor/index.tsx` that
   mounts on `[data-simulation-island][data-simulation="capacitor-lab"]` and
   reads the same `data-*` attributes (see `resistor/lib/config.ts`). Reuse the
   pattern: pure maths in `lib/`, a light 2D stage, a lazy 3D stage, and
   checkpoints that grade with the same rules as the PHP class. Put the shared
   test vectors in `tests/fixtures/` and check them from both sides.
3. **Build.** Add the entry (and a CSS file if it has one) to `input` in
   `vite.config.js`. The `@/` alias points at `resources/js/simulations`.
4. **Assets.** Self-host anything it needs under `public/simulations/capacitor/`,
   add it to `scripts/fetch-assets.mjs` if it is downloaded, and record source
   and licence in `docs/ASSETS.md`.
5. **Tests.** Copy `tests/Feature/SimulationAttemptTest.php` and adapt the
   `correctAnswers()` helper.

The Blade partial reads `css()`, `entry()` and `assetPath()` from the simulation, so a
lab with its own stylesheet or assets only has to return them. `reportsLocalScore()`
is true when the browser computes a score the server must match (resistor lab) and
false when the server is the only grader (circuit workbench). All labs share
`resources/css/simulations/labs.css` (renamed from `resistor.css`).

## Circuit workbench (`circuit-sandbox`)

An open, Packet Tracer style bench for ELC724202 (wire and test circuits),
ELC724205 (measure with a multimeter, Ohm's law, series/parallel), ELC311201/2
(calculation, symbols) and ELC724336 (troubleshooting). Two modes in one page:

- **Free build**: ungraded, nothing sent to the server; autosaves in the browser.
  Parts: 9 V battery, adjustable supply, resistor (E12), LED, SPST switch,
  junction, multimeter (V, A, Ω, continuity). Schematic symbols, not a breadboard.
- **Challenges**: five of six types per visit (build an LED circuit, measure a
  voltage, measure a current, Ohm's law, parallel resistance, troubleshoot).
  The server issues the numbers, re-solves the submitted circuit and grades it.
  There is no client score to trust (`reportsLocalScore()` is false).

**3D bench.** A "Schematic / 3D bench" switch shows the *same* circuit document laid
out on a board in three.js (`circuit/three/`): binding posts at every pin, a resistor with
its colour bands, an LED that glows with its real current and goes dark when burnt,
a battery, a bench supply, a switch whose lever follows its state, a multimeter whose
display and dial follow its mode, and arched jumper wires. It is a view, not a second
editor: edits, solving and grading are unchanged, so the server never sees the 3D.
Clicking a part selects it and clicking a switch flips it. The 3D chunk loads only
when the view is opened; devices without WebGL keep the schematic. Parts are
procedural (no model files); sizes are real except the resistor (about 2x) and the multimeter (compact).

Solver: DC nodal analysis, dense Gaussian elimination, piecewise-linear LED,
10 MΩ voltmeter, fused ammeter. It exists twice, `resources/js/simulations/circuit/lib/solver.ts`
and `app/Simulations/Circuit/Solver.php`, with the same operation order. Both are
checked against hand-worked cases in `tests/fixtures/circuit-vectors.json`.

Limits: the LED is Vf plus series resistance, not SPICE; no capacitors, diodes
or transistors yet; canvas editing is never fully equivalent for keyboard and
screen-reader users (a text "parts and connections" panel is provided).

## Resistor lab: chapters and the Training Regulations

Codes are from p.1 of the TESDA TR for Electronic Products Assembly and
Servicing NC II.

| Lab part | What the student does | TR reference |
| --- | --- | --- |
| 1. The part | Identifies a 1/4 W carbon-film resistor, its body, leads, rating, no polarity | **ELC724205** *Test electronic components*, required knowledge 2.4.4 "Describing resistance and identify resistors" |
| 2. Colour code | Reads the four bands, digit by digit, multiplier and tolerance | ELC724205 2.4.4 |
| 3. Measure it | Removes power, sets the meter to Ω, measures, compares with the tolerance range, decides pass/fail | ELC724205 2.4.6 "Measuring resistance using VOM", 2.4.7 "Testing resistors"; learning outcomes 7.3 *Test components*, 7.4 *Evaluate the testing process*; range of variables 6.2 *Digital VOM* |
| 4. The circuit and its symbol | Matches the bench circuit to its schematic: R1 (IEC rectangle, US zig-zag noted), B1 with + long plate, conventional current direction | **ELC311202** *Prepare and interpret technical drawing*, PC 1.3 "identified and interpreted symbols used in the drawing"; ELC724205 2.4.1 |
| 5. Ohm's law | Solves V = I × R with SI prefixes, checks P = I²R against the 0.25 W rating | **ELC311201** *Perform mensuration and calculation*, PC 2.3–2.4 (four operations, fractions/percentages), 2.6; ELC724205 2.4.9 "Analyzing simple circuit using ohms and power law" |
| 6. Build your own | Paints any part, measures it | ELC724205 2.4.4, 2.4.7 |
| Checkpoints | read a value · choose bands for a value · name a band's role · compute a current · judge a reading against tolerance | ELC724205 (read, bands, role, tolerance); ELC311201 (current) |

The TR's training standards list "simulation", "eLearning/blended" and
"viewing multimedia" among the methodologies; the lab supports, and does not
replace, the hands-on practical and institutional assessment the TR requires.

## Defense notes

- **Objective fulfilled:** 1.a.iv, *Student interface: Simulation*. The paper
  also promises that "the system ... automatically records quiz scores and
  simulation performance" and that instructors "assess quiz and simulation
  results". Both are implemented: `simulation_attempts`, the dashboard card,
  the instructor's *Lab* column and the activity log.
- **TR competencies covered:** ELC724205 *Test electronic components* (main),
  ELC311201 *Perform mensuration and calculation*, ELC311202 *Prepare and
  interpret technical drawing* (symbols only).
- **Competency codes corrected.** The seeder and landing page used
  ELC724331/333/334, which do not exist in the TR. They are now ELC311202,
  ELC724201 and ELC724202, and ELC724205 was added. ELC724335 was already
  right.
- **A detail a panelist may raise:** the TR's own competency-standard page for
  *Test Electronic Components* (p.32) prints the code as `ELC724xxx`. The
  qualification's unit list on p.1 gives **ELC724205**, which is what the
  platform uses.
- **Scores cannot be faked from the browser.** The questions are generated on
  the server and kept in the student's session. The server regrades the raw
  answers, and a request whose score disagrees is refused (HTTP 422). Each set
  of questions can be submitted once.
- **Low-end PCs and phones.** WebGL and device memory are detected. Weak
  devices start on the light 2D bench (≈ 109 KB gzip, no three.js) and the
  student can switch either way. The 3D bench is about 1.6 MB, loaded once and
  only on that page. Nothing is fetched from the internet at run time except
  the platform's existing Google Fonts and SweetAlert.
- **Accessible.** Keyboard-operable radio groups for every band, text names on
  every colour (the colour check shows some band pairs are hard to tell apart
  under colour-vision deficiency, as on real parts), `prefers-reduced-motion`
  turns camera moves into cuts, and live regions announce readings and results.

## Checks to run

```bash
php artisan test                # PHP: access, attempts, grading, seeding, codes
npm run typecheck
npm run check:resistor          # TS colour code == PHP colour code (shared vectors)
npm run check:colors            # ΔE2000 between band paints, incl. CVD simulation
npm run check:framing           # every camera keyframe frames its subject
npm run check:browser           # the lab, end to end; needs a running, seeded server and Chrome
npm run check:circuit          # circuit solver vs hand-worked vectors (TS side; PHP side is in php artisan test)
npm run check:circuit-ui       # the workbench in headless Chrome: build, measure, five challenges, phone, bundles
npm run check:circuit-3d       # the 3D bench: lazy-loaded, labels, switch and LED follow the schematic, phone and desktop
npm run check:landing           # the public hero: 3D on desktop, static on phones, reduced motion, no WebGL, no JS
```
