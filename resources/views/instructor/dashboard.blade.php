@extends('layouts.dashboard')

@section('title', 'Classes')

@section('main')
<main class="page page--wide">

  <div class="page-head page-head--row">
    <div>
      <h1 class="page-title">{{ $section->name }}</h1>
      <p class="page-sub">{{ $stats['enrolled'] }} students &middot; EPAS NC II</p>
    </div>
    <form method="get" action="{{ route('instructor.dashboard') }}" style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2)">
      <label for="section-switch">Section</label>
      <select id="section-switch" name="section" class="field" onchange="this.form.submit()" style="width:auto;min-height:40px;padding-top:8px;padding-bottom:8px">
        @foreach ($sections as $option)
          <option value="{{ $option->id }}" @selected($option->id === $section->id)>{{ $option->name }}</option>
        @endforeach
      </select>
      <noscript><button type="submit" class="btn btn--sm btn--dark">Go</button></noscript>
    </form>
  </div>

  <div class="stat-row" style="margin-bottom:clamp(16px,2.4vw,22px)" data-reveal>
    <div class="card stat">
      <p class="stat__label">Students enrolled</p>
      <p class="stat__value tnum">{{ $stats['enrolled'] }}</p>
      <p class="stat__foot">{{ $stats['opened_this_week'] }} opened a module this week</p>
    </div>
    <div class="card stat">
      <p class="stat__label">Average quiz score</p>
      <p class="stat__value tnum">{{ $stats['average_quiz'] }}<small>%</small></p>
      <p class="stat__foot">Across submitted self-checks</p>
    </div>
    <div class="card stat stat--dark">
      <p class="stat__label">Waiting for your sign-off</p>
      <p class="stat__value tnum">{{ $stats['queue'] }}</p>
      <p class="stat__foot">Job sheets against the criteria</p>
    </div>
    <div class="card stat stat--flag">
      <p class="stat__label">Falling behind</p>
      <p class="stat__value tnum">{{ $stats['behind'] }}</p>
      <p class="stat__foot">Low progress or no recent activity</p>
    </div>
  </div>

  <div class="grid-2col">
    <div class="stack">
      <section class="card card--raised" data-reveal>
        <div class="card__head card__head--row">
          <div>
            <h2 class="card__title">Check these today</h2>
            <p class="card__note">Job sheets submitted for sign-off against the performance criteria.</p>
          </div>
          <span class="mono" style="font-size:13px;color:var(--ink-2)">{{ $queue->count() }} left</span>
        </div>

        @if ($queue->isEmpty())
          <div class="empty">
            <svg viewBox="0 0 60 60" width="48" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="none" stroke="#2F7D55" stroke-width="3" stroke-opacity=".5"></circle><path d="M17 31 L26 40 L44 20" fill="none" stroke="#2F7D55" stroke-width="4"></path></svg>
            <p class="empty__title">Wala nang naghihintay</p>
            <p class="empty__text">Everyone you signed off got their competency credited. The next batch shows up here as students submit.</p>
          </div>
        @else
          <ul class="list">
            @foreach ($queue as $item)
              <li class="list__row">
                <span class="avatar avatar--sq">{{ $item->student->initials() }}</span>
                <span class="grow" style="min-width:150px">
                  <span class="row-title">{{ $item->student->name }}</span>
                  <span class="row-sub" style="color:var(--ink-2);font-size:13px">{{ $item->label }}</span>
                  <span class="row-sub">Submitted {{ $item->submitted_at->diffForHumans() }}</span>
                </span>
                <span style="display:flex;gap:8px;flex:none">
                  <form method="post" action="{{ route('instructor.job-sheets.update', $item) }}" data-confirm="This credits the competency for {{ $item->student->firstName() }} against the performance criteria." data-confirm-title="Mark this achieved?" data-confirm-btn="Mark achieved">
                    @csrf @method('PATCH')<input type="hidden" name="decision" value="achieved">
                    <button type="submit" class="btn btn--sm btn--pass">Mark achieved</button>
                  </form>
                  <form method="post" action="{{ route('instructor.job-sheets.update', $item) }}" data-confirm="{{ $item->student->firstName() }} will be asked to redo this and submit it again." data-confirm-title="Send this back?" data-confirm-btn="Ask to redo" data-confirm-icon="warning">
                    @csrf @method('PATCH')<input type="hidden" name="decision" value="redo">
                    <button type="submit" class="btn btn--sm btn--outline">Ask to redo</button>
                  </form>
                </span>
              </li>
            @endforeach
          </ul>
        @endif
      </section>

      <section class="card" data-reveal>
        <div class="card__head">
          <h2 class="card__title">Students falling behind</h2>
          <p class="card__note">Sorted by how far along they are.</p>
        </div>
        @if ($behind->isEmpty())
          <p class="card__pad" style="font-size:14px;color:var(--ink-2)">Nobody is flagged right now.</p>
        @else
          <ul class="list">
            @foreach ($behind as $row)
              <li class="list__row">
                <span class="grow" style="min-width:170px">
                  <span class="row-title">{{ $row['student']->name }}</span>
                  <span class="row-sub" style="color:{{ $row['percent'] < 20 ? '#8A241C' : '#79510B' }}">{{ $row['reason'] }}</span>
                </span>
                <span class="meter meter--sm" style="width:88px;flex:none"><span class="meter__fill {{ $row['percent'] < 20 ? 'meter__fill--fail' : 'meter__fill--caution' }}" style="--v:{{ max($row['percent'],3) / 100 }}"></span></span>
                <span class="tnum" style="font-size:13px;width:38px;text-align:right;flex:none">{{ $row['percent'] }}%</span>
                <button type="button" class="btn btn--tiny btn--outline" data-message="{{ $row['student']->id }}" data-message-name="{{ $row['student']->firstName() }}">Message</button>
              </li>
            @endforeach
          </ul>
        @endif
      </section>
    </div>

    <div class="stack">
      <section class="card card__pad" data-reveal>
        <h2 class="card__title" style="margin-bottom:12px">Post an announcement</h2>
        <form method="post" action="{{ route('instructor.announcements.store') }}" style="display:grid;gap:10px">
          @csrf<input type="hidden" name="section_id" value="{{ $section->id }}">
          <textarea name="body" class="field" rows="3" maxlength="500" required placeholder="Shows on {{ $section->name }}'s dashboard">{{ old('body') }}</textarea>
          @error('body')<p class="field-error">{{ $message }}</p>@enderror
          <button type="submit" class="btn btn--dark" style="justify-self:start">Post to the section</button>
        </form>
        <div class="hr"></div>
        <div style="display:grid;gap:9px">
          <a href="{{ route('instructor.lessons.index') }}" class="card card__pad" style="display:flex;gap:11px;align-items:center;border-left:3px solid var(--copper)">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex:none"><rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="#0F2A22" stroke-width="1.6"></rect><path d="M5.5 7 H14.5 M5.5 10.5 H14.5 M5.5 14 H11" stroke="#0F2A22" stroke-width="1.6"></path></svg>
            <span><span style="display:block;font-size:14px;font-weight:600">Write a lesson</span><span class="row-sub">Add or edit module pages</span></span>
          </a>
          <a href="{{ route('instructor.quizzes.create') }}" class="card card__pad" style="display:flex;gap:11px;align-items:center;border-left:3px solid var(--copper)">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex:none"><circle cx="10" cy="10" r="8" fill="none" stroke="#0F2A22" stroke-width="1.6"></circle><path d="M6.5 10.5 L9 13 L14 7.5" fill="none" stroke="#0F2A22" stroke-width="1.6"></path></svg>
            <span><span style="display:block;font-size:14px;font-weight:600">Build a quiz</span><span class="row-sub">Self-check items, assign to a section</span></span>
          </a>
        </div>
      </section>

      @if ($hardestItem)
        <section class="card card--flat card__pad" data-reveal>
          <h2 class="card__title">Hardest quiz item</h2>
          <p class="card__note" style="margin:4px 0 10px">Only {{ $hardestItem['right'] }} of {{ $hardestItem['total'] }} attempts got this right.</p>
          <p class="card card__pad" style="font-size:14px;line-height:1.45">{{ $hardestItem['stem'] }}</p>
        </section>
      @endif

      <section class="card card__pad" data-reveal>
        <h2 class="card__title">Class progress</h2>
        <p class="card__note" style="margin:2px 0 14px">Average across {{ $stats['enrolled'] }} students.</p>
        <div style="display:grid;gap:13px">
          @foreach ($classProgress as $row)
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>{{ $row['title'] }}</span><span class="tnum" style="color:var(--ink-2)">{{ $row['percent'] }}%</span></div>
              <div class="meter"><span class="meter__fill {{ $row['percent'] >= 60 ? 'meter__fill--pass' : ($row['percent'] >= 40 ? 'meter__fill--caution' : 'meter__fill--fail') }}" style="--v:{{ $row['percent'] / 100 }}"></span></div>
            </div>
          @endforeach
        </div>
      </section>
    </div>
  </div>
</main>
@endsection
