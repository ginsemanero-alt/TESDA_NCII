<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EPAS NC II &middot; Rizal National High School</title>
<meta name="description" content="TESDA learning materials for Electronic Products Assembly and Servicing NC II. Read the module, do the job sheet, take the quiz, and get your instructor's sign-off. Built for Grade 11 and 12 shop classes at Rizal National High School.">
@php
  // The hero is progressive: with the built assets it can go live in 3D. Without them (no
  // `npm run build` yet, or an older build that predates the hero) the public front page must
  // not break, so it simply keeps its static hero.
  $heroManifest = public_path('build/manifest.json');
  $heroLive = file_exists(public_path('hot'))
    || (is_file($heroManifest) && collect(['resistor/landing.ts', 'simulations/labs.css'])->every(fn ($entry) => str_contains((string) file_get_contents($heroManifest), $entry)));
@endphp
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#E9EBE4;-webkit-font-smoothing:antialiased}
  a{color:#8A5228;text-decoration:none}
  a:hover{color:#0C120F}
  :focus-visible{outline:3px solid #B4703A;outline-offset:2px;border-radius:2px}
  [data-reveal]{opacity:.001;transform:translateY(14px);transition:opacity 500ms cubic-bezier(.16,.84,.44,1),transform 500ms cubic-bezier(.16,.84,.44,1)}
  [data-reveal="in"]{opacity:1;transform:none}
  @media (max-width:479px){[data-navlink]{display:none}[data-brand-sub]{display:none}.epas-btn--head{padding:9px 12px !important;font-size:13.5px !important}}
  [data-bar]{transform:scaleX(0);transform-origin:left;transition:transform 700ms cubic-bezier(.16,.84,.44,1)}
  [data-bar="in"]{transform:scaleX(var(--v))}
  [data-pick]{transition:transform 150ms cubic-bezier(.16,.84,.44,1),border-color 150ms linear,background-color 150ms linear;cursor:pointer;border:1.5px solid rgba(12,25,20,.2);background:#E9EBE4;color:#39443E}
  [data-pick]:hover{transform:translateY(-1px)}
  [data-pick]:active{transform:translateY(0) scale(.98)}
  [data-pick="right"]{border-color:#2F7D55;background:rgba(47,125,85,.14);color:#215C3E}
  [data-pick="wrong"]{border-color:#A93227;background:rgba(169,50,39,.10);color:#8A241C}
  @keyframes led{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
  @keyframes needle{from{transform:rotate(-46deg)}60%{transform:rotate(19deg)}80%{transform:rotate(12deg)}to{transform:rotate(15deg)}}
  [data-needle]{transform:rotate(-46deg);transform-origin:60px 52px}
  [data-needle="in"]{animation:needle 900ms cubic-bezier(.3,.7,.3,1) both}
  @keyframes trace{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
  @keyframes fadein{from{opacity:0}to{opacity:1}}
  @keyframes rise{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
  @keyframes bandin{from{opacity:0;transform:scaleY(.2)}to{opacity:1;transform:none}}
  .epas-btn{transition:background-color 150ms linear,border-color 150ms linear,transform 150ms cubic-bezier(.16,.84,.44,1)}
  .epas-btn:active{transform:translateY(1px)}
  .epas-btn--primary,.epas-btn--primary:hover{color:#FFF8F1}
  .epas-btn--primary:hover{background:var(--copper-dk)}
  .epas-btn--dark,.epas-btn--dark:hover{color:var(--paper)}
  .epas-btn--dark:hover{background:#0B211B}
  .epas-btn--outline,.epas-btn--outline:hover{color:var(--ink)}
  .epas-btn--outline:hover{background:rgba(12,25,20,.05)}

  /* --- Hero ------------------------------------------------------------------
     Static by default (and with no JavaScript, no WebGL, on phones, on weak PCs):
     copy on the left, the printed-circuit diagram on the right. landing.ts sets
     data-hero-mode="3d" on capable devices: a full-bleed board-green stage with the
     real 3D resistor pinned behind the copy, which scrolls over it in beats. */
  .epas-hero{--pin-h:max(460px,calc(100vh - var(--epas-hdr,64px)));display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:clamp(28px,4vw,56px);align-items:center;padding:clamp(32px,6vw,76px) clamp(16px,4vw,56px) clamp(36px,5vw,64px);max-width:1240px;margin:0 auto}
  @supports (height:100svh){.epas-hero{--pin-h:max(460px,calc(100svh - var(--epas-hdr,64px)))}}
  .epas-hero__pin{order:2}
  .epas-hero__beats{order:1}
  .epas-hero__stage,.epas-hero__word{display:none}
  .epas-hero__beat:not([data-hero-beat="intro"]){display:none}
  .epas-hero__pill{margin:0 0 14px;display:inline-flex;align-items:center;gap:8px;padding:5px 10px 5px 8px;background:var(--paper2);border:1px solid rgba(12,25,20,.14);border-radius:4px;font-size:12.5px;font-weight:500;color:#33403A}
  .epas-hero__pill i{width:7px;height:7px;border-radius:50%;background:var(--pass);flex:none}
  .epas-hero__h1{margin:0 0 16px;font-size:clamp(32px,5.4vw,54px);line-height:1.02;letter-spacing:-.028em;font-weight:700;text-wrap:pretty}
  .epas-hero__lead{margin:0 0 26px;font-size:clamp(16px,1.6vw,18.5px);line-height:1.55;color:#39443E;max-width:52ch;text-wrap:pretty}
  .epas-hero__actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
  .epas-hero__btn{display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;border-radius:5px;white-space:nowrap}
  .epas-hero__btn--primary{background:var(--copper);color:#FFF8F1;box-shadow:var(--e2)}
  .epas-hero__btn--primary:hover{background:var(--copper-dk);color:#FFF8F1}
  .epas-hero__btn--outline{padding:14px 20px;border:1.5px solid rgba(12,25,20,.24);color:var(--ink)}
  .epas-hero__btn--outline:hover{background:rgba(12,25,20,.05);color:var(--ink)}
  .epas-hero__note{margin:20px 0 0;font-size:13.5px;color:var(--muted)}
  .epas-hero__toggle{display:inline-block;margin:14px 0 0;padding:6px 0;background:none;border:0;font:inherit;font-size:13.5px;font-weight:600;color:var(--copper-dk);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
  .epas-hero__toggle[hidden]{display:none}
  .epas-hero__over{margin:0 0 8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:#E0AE7E}
  .epas-hero__title{margin:0 0 10px;font-size:clamp(1.7rem,3.4vw,2.7rem);line-height:.95;font-weight:900;letter-spacing:-.03em;text-transform:uppercase;color:#F2F4EE}
  .epas-hero__text{margin:0;font-size:16px;line-height:1.55;color:#C6CEC6}
  .epas-hero__boot{position:absolute;inset:0;display:grid;place-items:center;color:#C6CEC6;font-size:14px;font-weight:600}

  .epas-hero[data-hero-mode="3d"]{display:block;max-width:none;margin:0;padding:0;background:var(--board);color:#E4E8E0;border-radius:0 0 clamp(28px,5vw,64px) clamp(28px,5vw,64px);overflow:clip}
  .epas-hero[data-hero-mode="3d"] .epas-hero__pin{position:sticky;top:var(--epas-hdr,64px);height:var(--pin-h);background-color:var(--board);background-image:linear-gradient(rgba(224,174,126,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(224,174,126,.06) 1px,transparent 1px);background-size:48px 48px}
  .epas-hero[data-hero-mode="3d"] .epas-hero__visual{display:none}
  .epas-hero[data-hero-mode="3d"] .epas-hero__stage{display:block;position:absolute;inset:0}
  .epas-hero[data-hero-mode="3d"] .epas-hero__beats{position:relative;z-index:2;margin-top:calc(var(--pin-h) * -1);pointer-events:none}
  .epas-hero[data-hero-mode="3d"] .epas-hero__beat{display:flex;align-items:flex-end;min-height:calc(var(--pin-h) * .65);padding:0 clamp(16px,4vw,56px) 22px}
  .epas-hero[data-hero-mode="3d"] .epas-hero__beat[data-hero-beat="intro"]{min-height:var(--pin-h)}
  .epas-hero[data-hero-mode="3d"] .epas-hero__beat[data-hero-beat="circuit"]{min-height:calc(var(--pin-h) * .9)}
  .epas-hero[data-hero-mode="3d"] .epas-hero__card{pointer-events:auto;width:100%;max-width:34rem;padding:20px 22px;border-radius:1.75rem;background:rgba(15,42,34,.84);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(228,232,224,.12);color:#E4E8E0}
  .epas-hero[data-hero-mode="3d"] .epas-hero__word{display:block;margin:0 0 12px;font-size:clamp(2.6rem,12vw,5.5rem);line-height:.84;font-weight:900;letter-spacing:-.045em;text-transform:uppercase;color:#F2F4EE}
  .epas-hero[data-hero-mode="3d"] .epas-hero__word span{font-size:.38em;letter-spacing:-.02em;color:#E0AE7E}
  .epas-hero[data-hero-mode="3d"] .epas-hero__pill{background:rgba(228,232,224,.08);border-color:rgba(228,232,224,.18);color:#DDE5DD}
  .epas-hero[data-hero-mode="3d"] .epas-hero__h1{margin:0 0 12px;font-size:clamp(1.05rem,1.9vw,1.55rem);line-height:1.25;font-weight:600;letter-spacing:-.01em;color:#DDE5DD}
  .epas-hero[data-hero-mode="3d"] .epas-hero__sentence{display:block;max-width:32ch}
  /* A scrim between the bench and the copy: the breadboard is bright, the copy is light. */
  .epas-hero[data-hero-mode="3d"] .epas-hero__pin::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,rgba(15,42,34,.92) 0%,rgba(15,42,34,.6) 36%,rgba(15,42,34,0) 62%)}
  .epas-hero[data-hero-mode="3d"] .epas-hero__lead{color:#C6CEC6;font-size:16px;margin-bottom:22px}
  .epas-hero[data-hero-mode="3d"] .epas-hero__btn--outline{border-color:rgba(228,232,224,.35);color:#F2F4EE}
  .epas-hero[data-hero-mode="3d"] .epas-hero__btn--outline:hover{background:rgba(228,232,224,.1);color:#fff}
  .epas-hero[data-hero-mode="3d"] .epas-hero__note{color:#9FAEA2}
  .epas-hero[data-hero-mode="3d"] .epas-hero__toggle{color:#E0AE7E}
  /* Stacked: the card sits under the part, so keep it short. */
  @media not all and (min-width:900px) and (min-aspect-ratio:5/4){
    .epas-hero[data-hero-mode="3d"] .epas-hero__lead,.epas-hero[data-hero-mode="3d"] .epas-hero__note{display:none}
  }
  /* Landscape and wide enough for the copy to sit beside the part (keep in step with HERO.besideQuery in lib/experience.ts). */
  @media (min-width:900px) and (min-aspect-ratio:5/4){
    .epas-hero[data-hero-mode="3d"] .epas-hero__pin::after{background:linear-gradient(90deg,rgba(15,42,34,.95) 0%,rgba(15,42,34,.8) 28%,rgba(15,42,34,.35) 44%,rgba(15,42,34,0) 56%)}
    .epas-hero[data-hero-mode="3d"] .epas-hero__beat{align-items:center}
    .epas-hero[data-hero-mode="3d"] .epas-hero__card{max-width:min(34rem,40vw)}
    .epas-hero[data-hero-mode="3d"] .epas-hero__word{font-size:clamp(3.2rem,9vw,8.5rem)}
    .epas-hero[data-hero-mode="3d"] [data-hero-beat="intro"] .epas-hero__card{max-width:min(40rem,42vw);padding:0;background:none;border:0;-webkit-backdrop-filter:none;backdrop-filter:none}
  }
  @media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{animation:none !important;transition:none !important}
    [data-reveal]{opacity:1 !important;transform:none !important}
  }
</style>
<noscript><style>
  [data-reveal]{opacity:1 !important;transform:none !important}
  [data-bar]{transform:scaleX(var(--v)) !important}
  [data-needle]{transform:rotate(15deg) !important}
</style></noscript>
@if ($heroLive)
  @vite(['resources/css/simulations/labs.css', 'resources/js/simulations/resistor/landing.ts'])
@endif
</head>
<body>
<div style="--board:#0F2A22;--board2:#17392E;--paper:#E9EBE4;--paper2:#DEE1D8;--ink:#0C120F;--copper:#B4703A;--copper-dk:#8A5228;--pass:#2F7D55;--caution:#B07610;--fail:#A93227;--muted:#5F6C66;--e1:0 1px 2px rgba(12,25,20,.10);--e2:0 8px 20px -8px rgba(12,25,20,.22);--e3:0 26px 50px -18px rgba(12,25,20,.45);font-family:Archivo,'Helvetica Neue',Helvetica,sans-serif;color:var(--ink);background:var(--paper)">

  <header id="epas-header" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px clamp(16px,4vw,56px);border-bottom:1px solid rgba(12,25,20,.12);background:var(--paper);position:sticky;top:0;z-index:40">
    <div style="display:flex;align-items:center;gap:11px;min-width:0">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" style="flex:none;display:block"><rect x="1" y="1" width="28" height="28" rx="2" fill="#0F2A22"></rect><path d="M6 21 L6 15 L11 10 L24 10" fill="none" stroke="#B4703A" stroke-width="2"></path><circle cx="6" cy="21" r="2.4" fill="#DEE1D8"></circle><circle cx="24" cy="10" r="2.4" fill="#DEE1D8"></circle></svg>
      <div style="min-width:0">
        <div style="font-weight:700;font-size:15px;letter-spacing:-.01em;line-height:1.1;white-space:nowrap">EPAS NC II</div>
        <div data-brand-sub style="font-size:11.5px;color:var(--muted);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Rizal National High School</div>
      </div>
    </div>
    <nav style="display:flex;align-items:center;gap:6px;flex:none">
      <a href="#competencies" data-navlink style="padding:9px 12px;font-size:14px;font-weight:500;color:var(--ink);white-space:nowrap">Competencies</a>
      <a href="{{ route('sign-in') }}" class="epas-btn epas-btn--primary epas-btn--head" style="padding:10px 16px;font-size:14px;font-weight:600;color:#FFF8F1;background:var(--copper);border-radius:5px;box-shadow:var(--e1);white-space:nowrap;flex:none">Try the lab</a>
      <a href="{{ route('sign-in') }}" class="epas-btn epas-btn--dark epas-btn--head" style="padding:10px 16px;font-size:14px;font-weight:600;color:var(--paper);background:var(--board);border-radius:5px;box-shadow:var(--e1);white-space:nowrap;flex:none">Sign in</a>
    </nav>
  </header>

  <section id="epas-hero" class="epas-hero" data-hero-mode="static" aria-label="Welcome">
    @if ($heroLive)
      <script>
      // Best guess before first paint, so the layout does not jump when landing.ts confirms it
      // with the full check (WebGL, memory, motion). Phones and weak PCs start static.
      (function () {
        try {
          var s = document.getElementById('epas-hero');
          if (!s) { return; }
          var n = navigator, pref = null;
          try { pref = localStorage.getItem('epas.landing.hero'); } catch (e) {}
          var lean = (n.connection && n.connection.saveData) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2);
          var want = pref === '3d' ? true : pref === '2d' ? false : (matchMedia('(min-width: 768px)').matches && !lean);
          s.setAttribute('data-hero-mode', want ? '3d' : 'static');
        } catch (e) {}
      })();
      </script>
    @endif

    <div class="epas-hero__pin">
      {{-- The live 3D hero mounts here (landing.ts). Same bench and materials as the student lab, Realistic view. --}}
      <div id="epas-hero-stage" class="sim-island epas-hero__stage" data-assets="{{ asset('simulations/resistor') }}" data-simulation="resistor-lab">
        <div class="epas-hero__boot" role="status">Loading the 3D bench&hellip;</div>
      </div>

      <div class="epas-hero__visual">
        <div id="epas-hero-board" style="perspective:1100px;perspective-origin:60% 40%">
          <div id="epas-hero-tilt" style="position:relative;transform-style:preserve-3d;transition:transform 220ms cubic-bezier(.16,.84,.44,1);will-change:transform">
            <svg viewBox="0 0 480 360" width="100%" style="display:block;border-radius:3px;box-shadow:var(--e3)" role="img" aria-label="Circuit board diagram with a 10 kilohm resistor, drawn as the page loads.">
              <defs>
                <pattern id="pads" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="12" cy="12" r="1.4" fill="#E9EBE4" opacity=".16"></circle>
                </pattern>
              </defs>
              <rect width="480" height="360" fill="#0F2A22"></rect>
              <rect width="480" height="360" fill="url(#pads)"></rect>
              <rect x="14" y="14" width="452" height="332" fill="none" stroke="#E9EBE4" stroke-opacity=".22" stroke-width="1.5"></rect>
              <g fill="none" stroke="#B4703A" stroke-width="3.5" stroke-linecap="square">
                <path d="M44 300 L44 196 L140 100 L248 100" style="--len:360;stroke-dasharray:360;stroke-dashoffset:360;animation:trace 560ms cubic-bezier(.22,.72,.32,1) 120ms both"></path>
                <path d="M448 300 L448 152 L400 100 L364 100" style="--len:270;stroke-dasharray:270;stroke-dashoffset:270;animation:trace 560ms cubic-bezier(.22,.72,.32,1) 220ms both"></path>
                <path d="M44 300 L150 300 L188 262 L306 262" style="--len:280;stroke-dasharray:280;stroke-dashoffset:280;animation:trace 560ms cubic-bezier(.22,.72,.32,1) 300ms both"></path>
              </g>
              <g fill="#D8DCD2" style="animation:fadein 240ms linear 560ms both">
                <circle cx="44" cy="300" r="7"></circle><circle cx="448" cy="300" r="7"></circle><circle cx="306" cy="262" r="7"></circle>
              </g>
              <g style="animation:fadein 240ms linear 520ms both">
                <rect x="242" y="80" width="128" height="40" fill="none" stroke="#E9EBE4" stroke-opacity=".38" stroke-width="1"></rect>
                <rect x="250" y="85" width="112" height="30" rx="4" fill="#C6B79B"></rect>
              </g>
              <g style="transform-origin:center;animation:bandin 200ms cubic-bezier(.16,.84,.44,1) 620ms both">
                <rect x="264" y="85" width="10" height="30" fill="#6B4A2B"></rect>
                <rect x="282" y="85" width="10" height="30" fill="#15181A"></rect>
                <rect x="300" y="85" width="10" height="30" fill="#C4611B"></rect>
                <rect x="344" y="85" width="8" height="30" fill="#B4923A"></rect>
              </g>
              <g style="animation:fadein 260ms linear 760ms both">
                <text x="242" y="66" font-family="IBM Plex Mono, monospace" font-size="15" font-weight="500" fill="#E9EBE4">10 k&#937; &#177;5%</text>
                <text x="242" y="140" font-family="IBM Plex Mono, monospace" font-size="12" fill="#E9EBE4" fill-opacity=".55">R1</text>
                <text x="318" y="248" font-family="IBM Plex Mono, monospace" font-size="12" fill="#E9EBE4" fill-opacity=".55">U1</text>
              </g>
              <g fill="none" stroke="#E9EBE4" stroke-opacity=".3" stroke-width="1" style="animation:fadein 260ms linear 700ms both">
                <rect x="330" y="196" width="86" height="58"></rect>
                <path d="M330 210 L318 210 M330 226 L318 226 M330 242 L318 242"></path>
              </g>
            </svg>
            <div id="epas-quiz" role="group" aria-label="Practice question from Quiz 2" style="position:absolute;left:clamp(-8px,-2%,0px);bottom:-26px;transform:translateZ(46px);background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:6px;box-shadow:var(--e3);padding:13px 15px;max-width:min(300px,84%);animation:rise 420ms cubic-bezier(.16,.84,.44,1) 820ms both">
              <div style="font-size:12.5px;color:var(--muted);margin-bottom:5px">Quiz 2, question 4 of 10</div>
              <div style="font-size:15.5px;font-weight:600;line-height:1.25;margin-bottom:9px">Read the bands. What is the value?</div>
              <div style="display:flex;gap:7px;flex-wrap:wrap">
                <button type="button" data-answer="10k" data-pick="idle" aria-pressed="false" style="padding:7px 11px;border-radius:4px;font-size:13.5px;font-weight:600;font-family:inherit">10 k&#937;</button>
                <button type="button" data-answer="1k" data-pick="idle" aria-pressed="false" style="padding:7px 11px;border-radius:4px;font-size:13.5px;font-weight:600;font-family:inherit">1 k&#937;</button>
                <button type="button" data-answer="100" data-pick="idle" aria-pressed="false" style="padding:7px 11px;border-radius:4px;font-size:13.5px;font-weight:600;font-family:inherit">100 &#937;</button>
              </div>
              <p id="epas-quiz-feedback" role="status" aria-live="polite" lang="fil" hidden style="margin:9px 0 0;font-size:13px;line-height:1.4;color:#39443E;animation:rise 220ms cubic-bezier(.16,.84,.44,1) both"></p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {{-- Copy. Always in the page; in 3D mode the beats scroll over the pinned stage and drive its camera. --}}
    <div class="epas-hero__beats">
      <div class="epas-hero__beat" data-hero-beat="intro">
        <div class="epas-hero__card" style="animation:rise 600ms cubic-bezier(.16,.84,.44,1) both">
          <p class="epas-hero__pill"><i></i>TESDA learning materials, on your phone</p>
          <h1 class="epas-hero__h1"><span class="epas-hero__word" aria-hidden="true">EPAS <span>NC II</span></span> <span class="epas-hero__sentence">Learn to assemble and service electronic products, one competency at a time.</span></h1>
          <p class="epas-hero__lead">Read the module, follow the job sheet, take the quiz, and get your instructor's sign-off. Built for Grade 11 and 12 shop classes at Rizal National High School, and light enough to open on two bars of signal.</p>
          <div class="epas-hero__actions">
            <a href="{{ route('sign-in') }}" class="epas-btn epas-hero__btn epas-hero__btn--primary">Try the lab</a>
            <a href="#inside" class="epas-btn epas-hero__btn epas-hero__btn--outline">See what's inside</a>
          </div>
          <p class="epas-hero__note">Use the account your instructor gave you. No email needed.</p>
          <button type="button" class="epas-hero__toggle" data-hero-toggle aria-pressed="false" hidden>See it in 3D</button>
        </div>
      </div>

      <div class="epas-hero__beat" data-hero-beat="colorcode" data-step="0">
        <div class="epas-hero__card">
          <p class="epas-hero__over">The colour code &middot; band 1 of 4</p>
          <h2 class="epas-hero__title">Brown: first digit</h2>
          <p class="epas-hero__text">Start from the end where the bands crowd together. Brown stands for 1.</p>
        </div>
      </div>
      <div class="epas-hero__beat" data-hero-beat="colorcode" data-step="1">
        <div class="epas-hero__card">
          <p class="epas-hero__over">The colour code &middot; band 2 of 4</p>
          <h2 class="epas-hero__title">Black: second digit</h2>
          <p class="epas-hero__text">Black is 0. So far the value starts 1, 0.</p>
        </div>
      </div>
      <div class="epas-hero__beat" data-hero-beat="colorcode" data-step="2">
        <div class="epas-hero__card">
          <p class="epas-hero__over">The colour code &middot; band 3 of 4</p>
          <h2 class="epas-hero__title">Red: multiplier</h2>
          <p class="epas-hero__text">Red means &times;100, so 10 becomes 1&nbsp;000 &#937;. Written 1 k&#937;.</p>
        </div>
      </div>
      <div class="epas-hero__beat" data-hero-beat="colorcode" data-step="3">
        <div class="epas-hero__card">
          <p class="epas-hero__over">The colour code &middot; band 4 of 4</p>
          <h2 class="epas-hero__title">Gold: tolerance &plusmn;5%</h2>
          <p class="epas-hero__text">A real part can be 5% off: anywhere from 950 &#937; to 1&nbsp;050 &#937; is still a good 1 k&#937; resistor.</p>
        </div>
      </div>

      <div class="epas-hero__beat" data-hero-beat="measure">
        <div class="epas-hero__card">
          <p class="epas-hero__over">Test it &middot; ELC724205</p>
          <h2 class="epas-hero__title">Measure it</h2>
          <p class="epas-hero__text">Power off, meter on &#937;, one probe on each lead. A good part reads inside its tolerance range, and never exactly the printed value.</p>
        </div>
      </div>

      <div class="epas-hero__beat" data-hero-beat="circuit">
        <div class="epas-hero__card">
          <p class="epas-hero__over">Then power it up</p>
          <h2 class="epas-hero__title">A working circuit</h2>
          <p class="epas-hero__text" style="margin-bottom:18px">The same part in a loop with a 9 V battery and jumper wires. Sign in to try the lab yourself: checkpoints, scores and progress are saved with the account your instructor gave you.</p>
          <div class="epas-hero__actions">
            <a href="{{ route('sign-in') }}" class="epas-btn epas-hero__btn epas-hero__btn--primary">Try the lab</a>
            <a href="{{ route('sign-in') }}" class="epas-btn epas-hero__btn epas-hero__btn--outline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="inside" style="padding:clamp(44px,6vw,80px) clamp(16px,4vw,56px);background:var(--paper2);border-top:1px solid rgba(12,25,20,.10);border-bottom:1px solid rgba(12,25,20,.10);scroll-margin-top:76px">
    <div style="max-width:1240px;margin:0 auto">
      <h2 style="margin:0 0 8px;font-size:clamp(24px,3vw,34px);line-height:1.1;letter-spacing:-.02em;font-weight:700">What you do in here, every module</h2>
      <p style="margin:0 0 30px;font-size:16.5px;color:#39443E;max-width:56ch">The same four steps as your shop class, in the same order, so nothing new to figure out.</p>
      <ol data-reveal style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:14px">
        <li style="background:var(--paper);border:1px solid rgba(12,25,20,.12);border-top:3px solid var(--board);border-radius:5px;padding:18px;box-shadow:var(--e1)">
          <div style="font-size:26px;font-weight:700;color:var(--copper);line-height:1;margin-bottom:10px">1</div>
          <h3 style="margin:0 0 6px;font-size:17px;font-weight:600">Read the module</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.5;color:#39443E">Information sheets with the diagrams from the CBLM, split into short screens. Saved on your phone once you open it.</p>
        </li>
        <li style="background:var(--paper);border:1px solid rgba(12,25,20,.12);border-top:3px solid var(--board);border-radius:5px;padding:18px;box-shadow:var(--e1)">
          <div style="font-size:26px;font-weight:700;color:var(--copper);line-height:1;margin-bottom:10px">2</div>
          <h3 style="margin:0 0 6px;font-size:17px;font-weight:600">Do the job sheet</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.5;color:#39443E">Step-by-step work with the tools on your bench. Tick off each step as you finish it, even with the wifi off.</p>
        </li>
        <li style="background:var(--paper);border:1px solid rgba(12,25,20,.12);border-top:3px solid var(--board);border-radius:5px;padding:18px;box-shadow:var(--e1)">
          <div style="font-size:26px;font-weight:700;color:var(--copper);line-height:1;margin-bottom:10px">3</div>
          <h3 style="margin:0 0 6px;font-size:17px;font-weight:600">Take the quiz</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.5;color:#39443E">Ten questions from the self-check. You see which items you missed and can retake it twice.</p>
        </li>
        <li style="background:var(--paper);border:1px solid rgba(12,25,20,.12);border-top:3px solid var(--copper);border-radius:5px;padding:18px;box-shadow:var(--e1)">
          <div style="font-size:26px;font-weight:700;color:var(--copper);line-height:1;margin-bottom:10px">4</div>
          <h3 style="margin:0 0 6px;font-size:17px;font-weight:600">Get signed off</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.5;color:#39443E">Your instructor checks your output against the performance criteria and marks the competency achieved.</p>
        </li>
      </ol>
    </div>
  </section>

  <section id="phones" style="padding:clamp(44px,6vw,80px) clamp(16px,4vw,56px);background:var(--paper);overflow:hidden">
    <div style="max-width:1240px;margin:0 auto">
      <h2 style="margin:0 0 8px;font-size:clamp(24px,3vw,34px);line-height:1.1;letter-spacing:-.02em;font-weight:700">This is it on your phone</h2>
      <p style="margin:0 0 32px;font-size:16.5px;color:#39443E;max-width:54ch">Same screens your instructor sees on the laptop, laid out for a 5-inch phone held one-handed in the shop.</p>

      <div data-reveal style="display:flex;flex-wrap:wrap;gap:clamp(20px,3vw,40px);align-items:flex-start">

        <figure style="margin:0;display:flex;flex-direction:column;gap:10px">
          <div style="width:268px;padding:8px;background:#14171A;border-radius:30px;box-shadow:var(--e3)">
            <div style="background:var(--paper);border-radius:23px;overflow:hidden">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px;font-size:10.5px;font-weight:600;color:#39443E">
                <span>8:41</span>
                <span style="display:flex;align-items:center;gap:5px">
                  <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" fill="#0C120F"></rect><rect x="4" y="5" width="3" height="6" fill="#0C120F"></rect><rect x="8" y="3" width="3" height="8" fill="#0C120F" opacity=".25"></rect><rect x="12" y="0" width="3" height="11" fill="#0C120F" opacity=".25"></rect></svg>
                  <svg width="18" height="9" viewBox="0 0 18 9" aria-hidden="true"><rect x="0" y="0" width="15" height="9" rx="2" fill="none" stroke="#0C120F" stroke-width="1.2"></rect><rect x="1.5" y="1.5" width="8" height="6" fill="#0C120F"></rect><rect x="16" y="3" width="2" height="3" rx="1" fill="#0C120F"></rect></svg>
                </span>
              </div>
              <div style="padding:10px 14px 12px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px">
                  <div>
                    <div style="font-size:15px;font-weight:700;letter-spacing:-.01em">Kumusta, Jhon Rey</div>
                    <div style="font-size:10.5px;color:var(--muted)">Grade 12 Ampere</div>
                  </div>
                  <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 7px;background:var(--paper2);border-radius:3px;font-size:9.5px;font-weight:600;color:#33403A;white-space:nowrap">
                    <span style="width:6px;height:6px;border-radius:50%;background:var(--caution);animation:led 2200ms ease-in-out infinite"></span>Saved offline
                  </span>
                </div>

                <div style="background:var(--board);color:#E4E8E0;border-radius:6px;padding:12px;margin-bottom:12px;box-shadow:var(--e2)">
                  <div style="font-size:9.5px;color:#9FAAA2;margin-bottom:3px">Continue where you stopped</div>
                  <div style="font-size:12.5px;font-weight:600;line-height:1.25;margin-bottom:9px">Module 3, Mount and solder components</div>
                  <div style="height:5px;background:rgba(233,235,228,.18);border-radius:2px;overflow:hidden;margin-bottom:7px"><div data-bar style="--v:.62;height:100%;background:var(--copper);border-radius:2px"></div></div>
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#B5BEB6">Page 8 of 13</span>
                    <span style="padding:5px 10px;background:var(--copper);color:#FFF8F1;border-radius:4px;font-size:10.5px;font-weight:600">Continue</span>
                  </div>
                </div>

                <div style="font-size:10.5px;font-weight:600;color:#33403A;margin-bottom:7px">Your competencies</div>
                <div style="display:grid;gap:8px;margin-bottom:12px">
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px"><span>Assemble electronic products</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">62%</span></div>
                    <div style="height:5px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.62;height:100%;background:var(--pass);border-radius:2px"></div></div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px"><span>Technical drawings</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">40%</span></div>
                    <div style="height:5px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.4;height:100%;background:var(--pass);border-radius:2px"></div></div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px"><span>Hand tools and instruments</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">15%</span></div>
                    <div style="height:5px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.15;height:100%;background:var(--caution);border-radius:2px"></div></div>
                  </div>
                </div>

                <div style="border:1px solid rgba(12,25,20,.14);border-left:2px solid var(--copper);border-radius:4px;padding:9px 10px">
                  <div style="font-size:10px;color:var(--muted);margin-bottom:2px">From Ma'am Villamor, 2 days ago</div>
                  <div style="font-size:11px;line-height:1.35;color:#39443E" lang="fil">Bring your own soldering lead on Thursday. Practical starts 1 PM sa shop.</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-around;padding:9px 6px 11px;border-top:1px solid rgba(12,25,20,.12);background:var(--paper2)">
                <span style="display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;font-weight:600;color:var(--board)"><svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><rect x="1" y="1" width="13" height="13" rx="2" fill="none" stroke="#0F2A22" stroke-width="1.6"></rect><path d="M1 6 H14" stroke="#0F2A22" stroke-width="1.6"></path></svg>Home</span>
                <span style="display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;color:var(--muted)"><svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M2 2 H13 V13 H2 Z M2 5 H13 M5 5 V13" fill="none" stroke="#5F6C66" stroke-width="1.4"></path></svg>Modules</span>
                <span style="display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;color:var(--muted)"><svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><circle cx="7.5" cy="7.5" r="6" fill="none" stroke="#5F6C66" stroke-width="1.4"></circle><path d="M4.5 7.8 L6.6 10 L10.5 5.5" fill="none" stroke="#5F6C66" stroke-width="1.4"></path></svg>Quizzes</span>
                <span style="display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;color:var(--muted)"><svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><circle cx="7.5" cy="5" r="3" fill="none" stroke="#5F6C66" stroke-width="1.4"></circle><path d="M2 14 C2 10.5 4.5 9 7.5 9 C10.5 9 13 10.5 13 14" fill="none" stroke="#5F6C66" stroke-width="1.4"></path></svg>Me</span>
              </div>
            </div>
          </div>
          <figcaption style="font-size:13px;color:var(--muted);max-width:268px">Student dashboard. Progress bars fill from the real value when the screen mounts.</figcaption>
        </figure>

        <figure style="margin:0;display:flex;flex-direction:column;gap:10px;padding-top:clamp(0px,3vw,34px)">
          <div style="width:268px;padding:8px;background:#14171A;border-radius:30px;box-shadow:var(--e2)">
            <div style="background:var(--paper);border-radius:23px;overflow:hidden">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px;font-size:10.5px;font-weight:600;color:#39443E">
                <span>8:44</span>
                <span style="display:flex;align-items:center;gap:5px">
                  <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" fill="#0C120F"></rect><rect x="4" y="5" width="3" height="6" fill="#0C120F"></rect><rect x="8" y="3" width="3" height="8" fill="#0C120F" opacity=".25"></rect><rect x="12" y="0" width="3" height="11" fill="#0C120F" opacity=".25"></rect></svg>
                  <svg width="18" height="9" viewBox="0 0 18 9" aria-hidden="true"><rect x="0" y="0" width="15" height="9" rx="2" fill="none" stroke="#0C120F" stroke-width="1.2"></rect><rect x="1.5" y="1.5" width="8" height="6" fill="#0C120F"></rect><rect x="16" y="3" width="2" height="3" rx="1" fill="#0C120F"></rect></svg>
                </span>
              </div>
              <div style="padding:10px 14px 14px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                  <span style="font-size:11px;font-weight:600;color:#33403A">Quiz 2, Self-check 3.1</span>
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted)">4 of 10</span>
                </div>
                <div style="display:flex;gap:3px;margin-bottom:14px">
                  <span style="flex:1;height:3px;background:var(--pass);border-radius:2px"></span>
                  <span style="flex:1;height:3px;background:var(--pass);border-radius:2px"></span>
                  <span style="flex:1;height:3px;background:var(--fail);border-radius:2px"></span>
                  <span style="flex:1;height:3px;background:var(--copper);border-radius:2px"></span>
                  <span style="flex:6;height:3px;background:var(--paper2);border-radius:2px"></span>
                </div>
                <div style="font-size:13.5px;font-weight:600;line-height:1.3;margin-bottom:12px">Which multimeter setting do you use to check if a wire is broken?</div>
                <div style="display:grid;gap:7px;margin-bottom:14px">
                  <span style="padding:9px 11px;border:1px solid rgba(12,25,20,.16);border-radius:5px;font-size:11.5px;color:#39443E">DC voltage, 20 V</span>
                  <span style="padding:9px 11px;border:1.5px solid var(--board);background:var(--paper2);border-radius:5px;font-size:11.5px;font-weight:600;display:flex;justify-content:space-between;align-items:center">Continuity<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="6.5" fill="#0F2A22"></circle><path d="M3.5 6.8 L5.6 9 L9.5 4.6" fill="none" stroke="#E9EBE4" stroke-width="1.6"></path></svg></span>
                  <span style="padding:9px 11px;border:1px solid rgba(12,25,20,.16);border-radius:5px;font-size:11.5px;color:#39443E">Resistance, 200 k&#937;</span>
                  <span style="padding:9px 11px;border:1px solid rgba(12,25,20,.16);border-radius:5px;font-size:11.5px;color:#39443E">AC voltage, 750 V</span>
                </div>
                <div style="padding:10px 22px;background:var(--copper);color:#FFF8F1;border-radius:5px;font-size:12.5px;font-weight:600;text-align:center;box-shadow:var(--e1)">Next question</div>
                <div style="margin-top:9px;font-size:10px;color:var(--muted);text-align:center">Your answers are saved even if you lose signal.</div>
              </div>
            </div>
          </div>
          <figcaption style="font-size:13px;color:var(--muted);max-width:268px">Quiz screen. One question per page so it loads on a weak line.</figcaption>
        </figure>

        <figure style="margin:0;display:flex;flex-direction:column;gap:10px;padding-top:clamp(0px,5vw,64px);max-width:288px">
          <div style="background:var(--board);border-radius:8px;padding:16px;box-shadow:var(--e2)">
            <svg viewBox="0 0 120 82" width="100%" aria-label="Analog multimeter reading 10 kilohms." role="img" style="display:block">
              <rect x="4" y="4" width="112" height="74" rx="3" fill="#E4E4DC"></rect>
              <path d="M18 52 A42 42 0 0 1 102 52" fill="none" stroke="#0C120F" stroke-width="1.2"></path>
              <g stroke="#0C120F" stroke-width="1">
                <path d="M18 52 L23 52"></path><path d="M28 30 L32 33"></path><path d="M60 10 L60 15"></path><path d="M92 30 L88 33"></path><path d="M102 52 L97 52"></path>
              </g>
              <text x="16" y="64" font-family="IBM Plex Mono, monospace" font-size="6" fill="#0C120F">0</text>
              <text x="55" y="24" font-family="IBM Plex Mono, monospace" font-size="6" fill="#0C120F">10k</text>
              <text x="94" y="64" font-family="IBM Plex Mono, monospace" font-size="6" fill="#0C120F">&#8734;</text>
              <line data-needle x1="60" y1="52" x2="60" y2="16" stroke="#A93227" stroke-width="1.6"></line>
              <circle cx="60" cy="52" r="3.4" fill="#14171A"></circle>
              <rect x="40" y="60" width="40" height="13" rx="2" fill="#0F2A22"></rect>
              <text x="60" y="69.5" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7.5" fill="#E9EBE4">10.0 k&#937;</text>
            </svg>
          </div>
          <figcaption style="font-size:13px;color:#39443E">Every reading in the job sheets is the one your own meter shows, dial setting included. The needle settles once, then stops.</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section id="competencies" style="padding:clamp(44px,6vw,80px) clamp(16px,4vw,56px);background:var(--paper2);border-top:1px solid rgba(12,25,20,.10);scroll-margin-top:76px">
    <div style="max-width:1240px;margin:0 auto">
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:28px">
        <div>
          <h2 style="margin:0 0 8px;font-size:clamp(24px,3vw,34px);line-height:1.1;letter-spacing:-.02em;font-weight:700">The competencies you'll finish</h2>
          <p style="margin:0;font-size:16.5px;color:#39443E;max-width:54ch">The core assembly unit of the EPAS NC II qualification, plus the common units every assembler and service tech needs.</p>
        </div>
        <p style="margin:0;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--muted)">TESDA training regulation</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(288px,1fr));gap:16px">
        <article style="position:relative;background:var(--board);color:#E4E8E0;border-radius:5px;padding:20px;box-shadow:var(--e2);overflow:hidden">
          <svg viewBox="0 0 200 120" width="120" style="position:absolute;right:-10px;top:-8px;opacity:.28" aria-hidden="true"><path d="M10 110 L10 60 L46 24 L190 24" fill="none" stroke="#B4703A" stroke-width="4"></path></svg>
          <div style="position:relative">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#B4703A;margin-bottom:9px">ELC724335</div>
            <h3 style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.2">Assemble electronic products</h3>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.5;color:#C6CEC6">Prepare the unit and workplace, mount and solder components on a PCB, then test the assembled board.</p>
            <div style="display:flex;gap:14px;font-size:13px;color:#9FAAA2">
              <span>6 modules</span><span>18 job sheets</span>
            </div>
          </div>
        </article>

        <article style="background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:5px;padding:20px;box-shadow:var(--e1)">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--copper-dk);margin-bottom:9px">ELC311202</div>
          <h3 style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.2">Prepare and interpret technical drawing</h3>
          <p style="margin:0 0 14px;font-size:14.5px;line-height:1.5;color:#39443E">Read schematic symbols, block diagrams and wiring layouts, and sketch a circuit from a written spec.</p>
          <div style="display:flex;gap:14px;font-size:13px;color:var(--muted)"><span>4 modules</span><span>9 job sheets</span></div>
        </article>

        <article style="background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:5px;padding:20px;box-shadow:var(--e1)">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--copper-dk);margin-bottom:9px">ELC724201</div>
          <h3 style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.2">Use hand tools</h3>
          <p style="margin:0 0 14px;font-size:14.5px;line-height:1.5;color:#39443E">Prepare, use and maintain screwdrivers, pliers and the soldering iron the way the job sheet asks, without damaging the tool or the work.</p>
          <div style="display:flex;gap:14px;font-size:13px;color:var(--muted)"><span>3 modules</span><span>6 job sheets</span></div>
        </article>

        <article style="background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:5px;padding:20px;box-shadow:var(--e1)">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--copper-dk);margin-bottom:9px">ELC724202</div>
          <h3 style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.2">Terminate and connect electrical wiring and electronic circuits</h3>
          <p style="margin:0 0 14px;font-size:14.5px;line-height:1.5;color:#39443E">Strip, splice and terminate conductors, and check your joints for cold solder and shorts before power-up.</p>
          <div style="display:flex;gap:14px;font-size:13px;color:var(--muted)"><span>5 modules</span><span>12 job sheets</span></div>
        </article>

        <article style="background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:5px;padding:20px;box-shadow:var(--e1)">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--copper-dk);margin-bottom:9px">ELC724205</div>
          <h3 style="margin:0 0 8px;font-size:19px;font-weight:600;line-height:1.2">Test electronic components</h3>
          <p style="margin:0 0 14px;font-size:14.5px;line-height:1.5;color:#39443E">Read a resistor's colour code, measure it with the multimeter, and decide if it is inside tolerance. Includes the 3D resistor lab.</p>
          <div style="display:flex;gap:14px;font-size:13px;color:var(--muted)"><span>3 modules</span><span>1 simulation</span></div>
        </article>
      </div>
    </div>
  </section>

  <section style="background:var(--board);color:#E4E8E0;padding:clamp(44px,6vw,76px) clamp(16px,4vw,56px)">
    <div data-reveal style="max-width:1240px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:clamp(24px,4vw,48px);align-items:start">
      <div>
        <h2 style="margin:0 0 12px;font-size:clamp(23px,2.8vw,32px);line-height:1.12;letter-spacing:-.02em;font-weight:700">It still works when the signal drops</h2>
        <p style="margin:0;font-size:16.5px;line-height:1.55;color:#C6CEC6;max-width:46ch">The lab shares one line, so the platform is built to hold up on a weak connection instead of pretending you have a fast one.</p>
      </div>
      <dl style="margin:0;display:grid;gap:18px">
        <div style="border-left:2px solid var(--copper);padding-left:14px">
          <dt style="font-size:16.5px;font-weight:600;margin-bottom:4px">Pages open in under two seconds</dt>
          <dd style="margin:0;font-size:14.5px;line-height:1.5;color:#B5BEB6">Every screen stays under 200 KB, and there is no video you're forced to stream.</dd>
        </div>
        <div style="border-left:2px solid var(--copper);padding-left:14px">
          <dt style="font-size:16.5px;font-weight:600;margin-bottom:4px">Your quiz answers are kept on your phone</dt>
          <dd style="margin:0;font-size:14.5px;line-height:1.5;color:#B5BEB6">If you lose signal mid-quiz, nothing is lost. It uploads the next time you connect.</dd>
        </div>
        <div style="border-left:2px solid var(--copper);padding-left:14px">
          <dt style="font-size:16.5px;font-weight:600;margin-bottom:4px">Modules you opened stay readable offline</dt>
          <dd style="margin:0;font-size:14.5px;line-height:1.5;color:#B5BEB6">Read at home, on the jeep, or in the shop with the router down.</dd>
        </div>
      </dl>
    </div>
  </section>

  <section style="padding:clamp(44px,6vw,76px) clamp(16px,4vw,56px)">
    <div style="max-width:1240px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:clamp(24px,4vw,44px);align-items:center">
      <div>
        <h2 style="margin:0 0 12px;font-size:clamp(23px,2.8vw,32px);line-height:1.12;letter-spacing:-.02em;font-weight:700">For instructors and the school</h2>
        <p style="margin:0 0 18px;font-size:16.5px;line-height:1.55;color:#39443E;max-width:50ch">Write a lesson or a quiz once and assign it to a section. See who is behind before the grading period ends, not after.</p>
        <ul style="margin:0;padding:0;list-style:none;display:grid;gap:9px;font-size:15.5px;color:#39443E">
          <li style="display:flex;gap:9px"><span style="color:var(--pass);font-weight:700">&#10003;</span>Class list with each student's achieved competencies</li>
          <li style="display:flex;gap:9px"><span style="color:var(--pass);font-weight:700">&#10003;</span>Quiz scores exported for your class record</li>
          <li style="display:flex;gap:9px"><span style="color:var(--pass);font-weight:700">&#10003;</span>Announcements that reach the section's dashboard</li>
        </ul>
      </div>
      <div style="background:var(--paper);border:1px solid rgba(12,25,20,.14);border-radius:6px;box-shadow:var(--e2);padding:18px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
          <div style="font-size:15.5px;font-weight:600">Grade 12 Ampere</div>
          <div style="font-size:13px;color:var(--muted)">32 students</div>
        </div>
        <div style="display:grid;gap:12px">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>Assemble electronic products</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">78%</span></div>
            <div style="height:8px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.78;height:100%;background:var(--pass);border-radius:2px"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>Technical drawings</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">54%</span></div>
            <div style="height:8px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.54;height:100%;background:var(--caution);border-radius:2px"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>Wiring and circuits</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)">31%</span></div>
            <div style="height:8px;background:var(--paper2);border-radius:2px;overflow:hidden"><div data-bar style="--v:.31;height:100%;background:var(--fail);border-radius:2px"></div></div>
          </div>
        </div>
        <p style="margin:14px 0 0;font-size:13px;color:var(--muted)">Sample of the instructor view. Not live data.</p>
      </div>
    </div>
  </section>

  <section id="signin" style="padding:clamp(40px,5vw,68px) clamp(16px,4vw,56px);background:var(--paper2);border-top:1px solid rgba(12,25,20,.10);scroll-margin-top:76px">
    <div style="max-width:760px;margin:0 auto;text-align:center">
      <h2 style="margin:0 0 12px;font-size:clamp(24px,3.4vw,38px);line-height:1.08;letter-spacing:-.024em;font-weight:700">Ready when your class is</h2>
      <p style="margin:0 0 24px;font-size:17px;line-height:1.55;color:#39443E">Sign in with the username your instructor gave you. Forgot it? Ask Sir or Ma'am in the electronics shop, they can reset it.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
        <a href="{{ route('sign-in') }}" class="epas-btn epas-btn--primary" style="padding:14px 24px;background:var(--copper);color:#FFF8F1;font-size:16px;font-weight:600;border-radius:5px;box-shadow:var(--e2)">Sign in to start</a>
        <a href="#competencies" class="epas-btn epas-btn--outline" style="padding:14px 20px;border:1.5px solid rgba(12,25,20,.24);color:var(--ink);font-size:16px;font-weight:600;border-radius:5px">Browse the competencies</a>
      </div>
    </div>
  </section>

  <footer style="background:var(--board);color:#A9B3AB;padding:28px clamp(16px,4vw,56px)">
    <div style="max-width:1240px;margin:0 auto;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:baseline;font-size:13.5px;line-height:1.5">
      <div>
        <div style="color:#E4E8E0;font-weight:600;font-size:14.5px">Rizal National High School</div>
        <div>Rizal, Occidental Mindoro</div>
      </div>
      <div style="max-width:44ch">Learning materials adapted from the TESDA Competency-Based Learning Materials for Electronic Products Assembly and Servicing NC II.</div>
    </div>
  </footer>
</div>

<script>
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Practice question in the hero -------------------------------------------
  var quiz = document.getElementById('epas-quiz');
  if (quiz) {
    var buttons = quiz.querySelectorAll('[data-answer]');
    var feedback = document.getElementById('epas-quiz-feedback');
    var CORRECT = '10k';
    var MESSAGES = {
      right: 'Tama. Brown is 1, black is 0, orange means three zeros, so 10,000 ohms.',
      wrong: 'Mali. Read the first two bands as digits, then the third band tells you how many zeros to add. Try again.'
    };
    var choose = function (pick) {
      buttons.forEach(function (btn) {
        var value = btn.getAttribute('data-answer');
        var state = 'idle';
        if (value === pick) {
          state = value === CORRECT ? 'right' : 'wrong';
        } else if (value === CORRECT) {
          state = 'right';
        }
        btn.setAttribute('data-pick', state);
        btn.setAttribute('aria-pressed', value === pick ? 'true' : 'false');
      });
      feedback.textContent = pick === CORRECT ? MESSAGES.right : MESSAGES.wrong;
      feedback.hidden = false;
    };
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        choose(btn.getAttribute('data-answer'));
      });
    });
  }

  // --- Reveal on scroll, progress bars, meter needle --------------------------
  var revealNodes = document.querySelectorAll('[data-reveal]');
  var animNodes = document.querySelectorAll('[data-bar],[data-needle]');
  var markAnim = function (node) {
    node.setAttribute(node.hasAttribute('data-bar') ? 'data-bar' : 'data-needle', 'in');
  };

  if (reduce || !('IntersectionObserver' in window)) {
    revealNodes.forEach(function (n) { n.setAttribute('data-reveal', 'in'); });
    animNodes.forEach(markAnim);
  } else {
    var animObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        markAnim(entry.target);
        animObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    animNodes.forEach(function (n) { animObserver.observe(n); });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.setAttribute('data-reveal', 'in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    revealNodes.forEach(function (n) { revealObserver.observe(n); });
  }

  // Safety net: never let content stay hidden if an observer callback is missed.
  var mark = function (node) {
    if (node.hasAttribute('data-reveal')) {
      node.setAttribute('data-reveal', 'in');
    } else if (node.hasAttribute('data-bar')) {
      node.setAttribute('data-bar', 'in');
    } else {
      node.setAttribute('data-needle', 'in');
    }
  };
  var pending = function () {
    return document.querySelectorAll('[data-reveal=""],[data-bar=""],[data-needle=""]');
  };
  var revealInView = function () {
    var viewport = window.innerHeight || 0;
    pending().forEach(function (node) {
      var rect = node.getBoundingClientRect();
      if (rect.top < viewport * 1.05 && rect.bottom > -40) { mark(node); }
    });
  };
  requestAnimationFrame(revealInView);
  window.addEventListener('scroll', revealInView, { passive: true });
  setTimeout(function () { pending().forEach(mark); }, 1200);

  // --- Pointer tilt on the hero board (fine pointers, motion-safe) ------------
  var board = document.getElementById('epas-hero-board');
  var tilt = document.getElementById('epas-hero-tilt');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduce && finePointer && board && tilt) {
    board.addEventListener('pointermove', function (event) {
      var rect = board.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.transform = 'rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 5).toFixed(2) + 'deg)';
    });
    board.addEventListener('pointerleave', function () {
      tilt.style.transform = '';
    });
  }
})();
</script>
</body>
</html>
