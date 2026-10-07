@extends('layouts.dashboard')

@section('title', 'Quizzes')

@section('main')
<main class="page page--mid">
  <a href="{{ route('instructor.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>

  <div class="page-head page-head--row">
    <div>
      <h1 class="page-title">Quizzes</h1>
      <p class="page-sub">Self-checks you have built. Publish one to open it for a section.</p>
    </div>
    <a href="{{ route('instructor.quizzes.create') }}" class="btn btn--primary">Build a quiz</a>
  </div>

  @if ($quizzes->isEmpty())
    <div class="card"><div class="empty"><p class="empty__title">No quizzes yet</p><p class="empty__text">Build your first self-check. Add items, assign a section, then publish.</p><a href="{{ route('instructor.quizzes.create') }}" class="btn btn--primary">Build a quiz</a></div></div>
  @else
    <div class="stack stack--sm">
      @foreach ($quizzes as $quiz)
        <section class="card card__pad">
          <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:flex-start">
            <div style="min-width:0">
              <div class="overline">{{ $quiz->competency->code }} &middot; {{ $quiz->items_count }} items &middot; pass {{ $quiz->pass_mark }}%</div>
              <h2 class="card__title" style="margin:3px 0 6px">{{ $quiz->title }}</h2>
              <span class="badge {{ $quiz->is_published ? 'badge--pass' : '' }}">{{ $quiz->is_published ? 'Published' : 'Draft' }}</span>
              @if ($quiz->sections->isNotEmpty())<span class="muted" style="font-size:12.5px"> &middot; {{ $quiz->sections->pluck('name')->join(', ') }}</span>@endif
            </div>
            <a href="{{ route('instructor.quizzes.edit', $quiz) }}" class="btn btn--sm btn--dark">Open</a>
          </div>
        </section>
      @endforeach
    </div>
  @endif
</main>
@endsection
