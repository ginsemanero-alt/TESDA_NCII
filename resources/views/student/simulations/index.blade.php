@extends('layouts.dashboard')

@section('title', 'Simulations')

@section('main')
<main class="page has-bottomnav" style="--page-w:840px">
  <a href="{{ route('student.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>
  <div class="page-head">
    <h1 class="page-title">Simulations</h1>
    <p class="page-sub">Practise on a virtual bench before the real one. Each lab ends with checkpoints your instructor can see.</p>
  </div>

  @if ($simulations->isEmpty())
    <div class="card"><div class="empty"><p class="empty__title">No labs yet</p><p class="empty__text">Your instructor has not opened a simulation for your section.</p></div></div>
  @else
    <div class="stack stack--sm">
      @foreach ($simulations as $row)
        <section class="card card__pad" data-simulation-row="{{ $row['simulation']->key() }}">
          <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:flex-start">
            <div style="min-width:0;flex:1 1 320px">
              <div class="overline">{{ implode(' · ', array_keys($row['simulation']->units())) }}</div>
              <h2 class="card__title" style="margin-top:3px">{{ $row['simulation']->title() }}</h2>
              <p style="margin-top:6px;font-size:13.5px;line-height:1.5;color:var(--ink-2);max-width:60ch">{{ $row['simulation']->summary() }}</p>
              <p style="margin-top:8px;font-size:13px;color:var(--ink-2)">
                @if ($row['last'])
                  Last {{ $row['last']->score }}/{{ $row['last']->max_score }}
                  <span style="color:{{ $row['last']->passed() ? '#1E5C3D' : '#79510B' }};font-weight:600">&middot; {{ $row['last']->passed() ? 'Passed' : 'Retake' }}</span>
                  &middot; best {{ $row['best']->score }}/{{ $row['best']->max_score }}
                  &middot; {{ $row['count'] }} {{ \Illuminate\Support\Str::plural('try', $row['count']) }}
                @else
                  Not tried yet
                @endif
              </p>
            </div>
            <a href="{{ route('student.simulations.show', $row['simulation']->key()) }}" class="btn btn--sm btn--primary" style="flex:none">{{ $row['last'] ? 'Open again' : 'Open the lab' }}</a>
          </div>
        </section>
      @endforeach
    </div>
  @endif
</main>
@endsection
