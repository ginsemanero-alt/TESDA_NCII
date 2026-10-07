@extends('layouts.dashboard')

@section('title', 'Quizzes')

@section('main')
<main class="page has-bottomnav" style="--page-w:840px">
  <a href="{{ route('student.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>
  <div class="page-head">
    <h1 class="page-title">Quizzes</h1>
    <p class="page-sub">Self-checks assigned to your section. Passing is each quiz's own mark.</p>
  </div>

  @if ($quizzes->isEmpty())
    <div class="card"><div class="empty"><p class="empty__title">No quizzes open</p><p class="empty__text">Nothing is assigned to your section right now. Check back after your next class.</p></div></div>
  @else
    <div class="stack stack--sm">
      @foreach ($quizzes as $row)
        <section class="card card__pad">
          <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:flex-start">
            <div style="min-width:0">
              <div class="overline">{{ $row['quiz']->competency->code }} &middot; {{ $row['quiz']->items_count ?? $row['quiz']->items->count() }} items &middot; pass {{ $row['quiz']->pass_mark }}%</div>
              <h2 class="card__title" style="margin-top:3px">{{ $row['quiz']->title }}</h2>
              <p style="margin-top:6px;font-size:13px;color:var(--ink-2)">
                @if ($row['latest'])
                  Last score {{ $row['latest']->score }}/{{ $row['latest']->total }}
                  <span style="color:{{ $row['latest']->status === 'passed' ? '#1E5C3D' : '#79510B' }};font-weight:600">&middot; {{ $row['latest']->status === 'passed' ? 'Passed' : 'Retake' }}</span>
                  &middot; {{ $row['attempts_left'] }} of {{ $row['quiz']->max_attempts }} tries left
                @else
                  Not taken yet &middot; {{ $row['quiz']->max_attempts }} tries
                @endif
              </p>
            </div>
            <div style="display:flex;gap:8px;flex:none">
              @if ($row['latest'])
                <a href="{{ route('student.quizzes.result', $row['quiz']) }}" class="btn btn--sm btn--outline">See result</a>
              @endif
              @if ($row['attempts_left'] > 0)
                <a href="{{ route('student.quizzes.show', $row['quiz']) }}" class="btn btn--sm btn--primary">{{ $row['latest'] ? 'Retake' : 'Start quiz' }}</a>
              @else
                <span class="muted" style="font-size:13px;align-self:center">No tries left</span>
              @endif
            </div>
          </div>
        </section>
      @endforeach
    </div>
  @endif
</main>
@endsection
