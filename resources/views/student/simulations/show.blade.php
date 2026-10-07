@extends('layouts.dashboard')

@section('title', $simulation->title())

@section('main')
<main class="page has-bottomnav" style="--page-w:1160px">
  <a href="{{ route('student.simulations.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All simulations</a>

  <div class="overline" style="margin-bottom:4px">{{ implode(' · ', array_keys($simulation->units())) }} &middot; Simulation</div>
  <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">{{ $simulation->title() }}</h1>
  <p style="margin:6px 0 18px;font-size:14px;line-height:1.5;color:var(--ink-2);max-width:68ch">
    {{ $simulation->summary() }}
    @if ($last)
      <span class="mono" style="font-size:12.5px;color:var(--muted)">Last try {{ $last->score }}/{{ $last->max_score }}, {{ $last->completed_at->diffForHumans() }}.</span>
    @endif
  </p>

  @include('partials.simulation-island', ['simulation' => $simulation, 'issued' => $issued, 'page' => null])
</main>
@endsection
