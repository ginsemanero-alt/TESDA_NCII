@extends('layouts.dashboard')

@section('title', 'Modules')

@section('main')
<main class="page page--mid has-bottomnav">
  <a href="{{ route('student.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>
  <div class="page-head">
    <h1 class="page-title">Modules</h1>
    <p class="page-sub">Every competency, its modules, and where you are in each one.</p>
  </div>

  <div class="stack">
    @foreach ($competencies as $row)
      <section class="card">
        <div class="card__head">
          <div class="overline">{{ $row['competency']->code }}</div>
          <h2 class="card__title" style="margin-top:3px">{{ $row['competency']->short_title }}</h2>
        </div>
        <ul class="list">
          @foreach ($row['modules'] as $m)
            <li>
              <a href="{{ $m['pages'] > 0 ? route('student.modules.show', $m['module']) : '#' }}" class="list__row"
                @if($m['pages'] === 0) data-info="This module has no pages yet. Your instructor adds them before it opens." data-info-title="{{ $m['module']->title }}" @endif>
                @include('partials.module-dot', ['status' => $m['status'], 'size' => 18])
                <span class="grow">
                  <span class="row-title">Module {{ $m['module']->number }} &middot; {{ $m['module']->title }}</span>
                  <span class="row-sub">
                    @if ($m['pages'] === 0) No pages yet
                    @elseif ($m['status'] === 'done') Done &middot; {{ $m['pages'] }} pages
                    @elseif ($m['status'] === 'in_progress') Page {{ $m['current_page'] }} of {{ $m['pages'] }}
                    @else {{ $m['pages'] }} pages &middot; not started @endif
                  </span>
                </span>
                @if ($m['pages'] > 0)
                  <span style="font-size:13px;color:var(--copper-dk);font-weight:600;flex:none">{{ $m['status'] === 'not_started' ? 'Start' : ($m['status'] === 'done' ? 'Review' : 'Continue') }} &rarr;</span>
                @endif
              </a>
            </li>
          @endforeach
        </ul>
      </section>
    @endforeach
  </div>
</main>
@endsection
