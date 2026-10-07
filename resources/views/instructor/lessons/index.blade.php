@extends('layouts.dashboard')

@section('title', 'Lessons')

@section('main')
<main class="page page--mid">
  <a href="{{ route('instructor.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>
  <div class="page-head">
    <h1 class="page-title">Lessons</h1>
    <p class="page-sub">Each module is a set of information-sheet pages. Open one to add or edit its pages.</p>
  </div>

  <div class="stack">
    @foreach ($competencies as $competency)
      <section class="card">
        <div class="card__head">
          <div class="overline">{{ $competency->code }}</div>
          <h2 class="card__title" style="margin-top:3px">{{ $competency->short_title }}</h2>
        </div>
        <ul class="list">
          @foreach ($competency->modules as $module)
            <li class="list__row">
              <span class="grow">
                <span class="row-title">Module {{ $module->number }} &middot; {{ $module->title }}</span>
                <span class="row-sub" style="color:{{ $module->pages_count > 0 ? 'var(--muted)' : '#79510B' }}">{{ $module->pages_count }} {{ \Illuminate\Support\Str::plural('page', $module->pages_count) }}{{ $module->pages_count === 0 ? ' — students cannot open this yet' : '' }}</span>
              </span>
              <a href="{{ route('instructor.lessons.edit', $module) }}" class="btn btn--sm btn--dark">{{ $module->pages_count > 0 ? 'Edit pages' : 'Add pages' }}</a>
            </li>
          @endforeach
        </ul>
      </section>
    @endforeach
  </div>
</main>
@endsection
