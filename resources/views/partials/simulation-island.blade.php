{{--
  Mount point for a simulation's React island.
  Expects: $simulation (App\Simulations\Simulation), $issued (['token', 'checkpoints']), $page (ModulePage|null).
  Only pages that include this partial load the lab's JS and CSS; the 3D bundle of a
  3D lab is a further lazy chunk the island fetches when the device can run it.
--}}
@push('head')
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
  @vite([$simulation->css(), $simulation->entry()])
@endpush

<div class="sim-breakout">
  <div
    id="{{ $simulation->key() }}"
    class="sim-island"
    data-simulation-island
    data-simulation="{{ $simulation->key() }}"
    data-title="{{ $simulation->title() }}"
    data-token="{{ $issued['token'] }}"
    data-checkpoints='@json($issued['checkpoints'])'
    data-post-url="{{ route('student.simulations.attempts.store', $simulation->key()) }}"
    data-module-page="{{ $page?->id }}"
    data-assets="{{ asset($simulation->assetPath()) }}"
    data-pass-percent="{{ \App\Models\SimulationAttempt::PASS_PERCENT }}"
  >
    <div class="sim-fallback" role="status">
      <p class="sim-fallback__title">Loading the {{ strtolower($simulation->title()) }}&hellip;</p>
      <p class="sim-fallback__text">If this message stays, your browser could not start the lab. Try Chrome or Edge, or ask your instructor for the printed job sheet.</p>
      <noscript><p class="sim-fallback__text"><strong>JavaScript is turned off.</strong> The lab needs it to run. Turn it on, or use a school computer.</p></noscript>
    </div>
  </div>
</div>
