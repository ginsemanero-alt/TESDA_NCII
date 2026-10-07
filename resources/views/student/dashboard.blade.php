@extends('layouts.dashboard')

@section('title', 'Dashboard')

@section('main')
<main class="page page--wide has-bottomnav" style="--page-w:1160px">

  <div class="page-head">
    <h1 class="page-title">Kumusta, {{ $student->firstName() }}</h1>
    <p class="page-sub">{{ $student->section?->name ?? 'No section yet' }} &middot; {{ now()->format('l, j F') }}</p>
  </div>

  <div class="grid-2col">
    <div class="stack">

      @if ($competencies->isEmpty())
        <section class="card card__pad--lg">
          <h2 class="card__title" style="font-size:19px">Wala pa dito, kasi bago ka pa lang</h2>
          <p style="margin-top:8px;font-size:14.5px;line-height:1.55;color:var(--ink-2);max-width:52ch">Your competencies show up here once your instructor opens the first module for your section.</p>
        </section>
      @else
        @if ($current)
          <section class="card card--dark card__pad--lg" style="position:relative;overflow:hidden" data-reveal>
            <svg viewBox="0 0 200 90" width="150" aria-hidden="true" style="position:absolute;right:-6px;top:-4px;opacity:.28"><path d="M6 84 L6 40 L40 8 L190 8" fill="none" stroke="#B4703A" stroke-width="4"></path></svg>
            <div style="position:relative">
              <p class="overline" style="color:#9FAEA2">Continue where you stopped</p>
              <h2 style="margin:6px 0 4px;font-size:clamp(18px,2.4vw,22px);line-height:1.2">{{ $current['title'] }}</h2>
              <p class="mono" style="font-size:12.5px;color:#9FAEA2;margin-bottom:16px">{{ $current['competency_code'] }} &middot; page {{ $current['page'] }} of {{ $current['pages'] }}</p>
              <div class="meter meter--onDark" style="margin-bottom:18px"><span class="meter__fill" style="--v:{{ $current['percent'] / 100 }}"></span></div>
              <a href="{{ route('student.modules.show', [$current['module'], 'p' => max(1, $current['page'])]) }}" class="btn btn--primary">Continue reading &rarr;</a>
            </div>
          </section>
        @endif

        <section class="card" data-accordion data-reveal>
          <div class="card__head">
            <h2 class="card__title">Your competencies</h2>
            <p class="card__note">Tap one to see its modules.</p>
          </div>
          @foreach ($competencies as $i => $competency)
            <div style="border-top:1px solid var(--line)">
              <button type="button" data-row aria-controls="epas-comp-{{ $i }}" aria-expanded="{{ $i === 0 ? 'true' : 'false' }}" class="list__row" style="align-items:flex-start">
                <span class="grow">
                  <span class="row-title" style="font-size:15px">{{ $competency['title'] }}</span>
                  <span class="row-sub mono">{{ $competency['code'] }}</span>
                  <span class="meter meter--sm" style="margin-top:9px;max-width:260px"><span class="meter__fill {{ $competency['percent'] >= 50 ? 'meter__fill--pass' : 'meter__fill--caution' }}" style="--v:{{ $competency['percent'] / 100 }}"></span></span>
                </span>
                <span class="tnum" style="font-size:13px;color:var(--ink-2);flex:none">{{ $competency['percent'] }}%</span>
                <svg data-chev width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style="flex:none;transition:transform .2s var(--ease);{{ $i === 0 ? 'transform:rotate(180deg)' : '' }}"><path d="M2 5 L7 10 L12 5" fill="none" stroke="#5F6C66" stroke-width="1.8"></path></svg>
              </button>
              <div id="epas-comp-{{ $i }}" @if($i !== 0) hidden @endif style="padding:0 var(--sp-4) var(--sp-4)">
                <ul class="list" style="display:grid;gap:7px">
                  @foreach ($competency['modules'] as $module)
                    <li style="border:0">
                      <a href="{{ route('student.modules.show', $module['id']) }}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-sm);font-size:14px;color:var(--ink);{{ $module['status'] === 'in_progress' ? 'background:var(--copper-tint);border:1px solid rgba(180,112,58,.3)' : 'background:var(--paper)' }}">
                        @include('partials.module-dot', ['status' => $module['status']])
                        <span style="flex:1;{{ $module['status'] === 'in_progress' ? 'font-weight:600' : '' }}">Module {{ $module['number'] }} &middot; {{ $module['title'] }}</span>
                        <span style="font-size:12px;color:{{ $module['status'] === 'in_progress' ? 'var(--copper-dk);font-weight:600' : 'var(--muted)' }}">{{ $module['label'] }}</span>
                      </a>
                    </li>
                  @endforeach
                </ul>
              </div>
            </div>
          @endforeach
        </section>

        <section class="card" data-reveal>
          <div class="card__head card__head--row">
            <h2 class="card__title">Recent quiz scores</h2>
            <span class="card__note">Passing is each quiz's own mark</span>
          </div>
          @if ($quizScores->isEmpty())
            <p class="card__pad" style="font-size:14px;color:var(--ink-2)">No quiz scores yet. <a href="{{ route('student.quizzes.index') }}">Take a quiz &rarr;</a></p>
          @else
            <ul class="list">
              @foreach ($quizScores as $quiz)
                <li>
                  <a href="{{ $quiz->quiz_id ? route('student.quizzes.result', $quiz->quiz_id) : route('student.quizzes.index') }}" class="list__row">
                    <span class="grow">
                      <span class="row-title">{{ $quiz->title }}</span>
                      <span class="row-sub">{{ $quiz->taken_on->format('j F') }}</span>
                    </span>
                    <span class="tnum" style="font-weight:600">{{ $quiz->score }}/{{ $quiz->total }}</span>
                    <span class="badge {{ $quiz->status === 'passed' ? 'badge--pass' : 'badge--caution' }}">{{ $quiz->status === 'passed' ? 'Passed' : 'Retake' }}</span>
                  </a>
                </li>
              @endforeach
            </ul>
            <div class="card__foot"><a href="{{ route('student.quizzes.index') }}">All quizzes &rarr;</a></div>
          @endif
        </section>
      @endif
    </div>

    <div class="stack">
      @if ($simulation)
        <section class="card card--dark card__pad" data-reveal data-simulation-card>
          <p class="overline" style="color:#9FAEA2">Simulation lab</p>
          <h2 style="margin:6px 0 4px;font-size:17px;line-height:1.25">{{ $simulation->title() }}</h2>
          @if ($lastSimulation)
            <div style="display:flex;align-items:center;gap:10px;margin:10px 0 14px">
              <span class="tnum" style="font-size:22px;font-weight:700">{{ $lastSimulation->score }}/{{ $lastSimulation->max_score }}</span>
              <span class="badge" style="background:{{ $lastSimulation->passed() ? 'var(--pass)' : 'var(--caution)' }};color:#FFFDF9">{{ $lastSimulation->passed() ? 'Passed' : 'Retake' }}</span>
              <span class="mono" style="font-size:12px;color:#9FAEA2">{{ $lastSimulation->completed_at->diffForHumans() }}</span>
            </div>
          @else
            <p style="margin:6px 0 14px;font-size:13.5px;line-height:1.5;color:#C6CEC6">{{ $simulation->summary() }}</p>
          @endif
          <a href="{{ route('student.simulations.show', $simulation->key()) }}" class="btn btn--sm btn--primary">{{ $lastSimulation ? 'Try the lab again' : 'Open the lab' }} &rarr;</a>
        </section>
      @endif

      <section class="card card__pad" data-reveal>
        <h2 class="card__title" style="margin-bottom:12px">Announcements</h2>
        @if ($announcements->isEmpty())
          <p style="font-size:14px;color:var(--muted)">Nothing from your instructor yet.</p>
        @else
          <div style="display:grid;gap:13px">
            @foreach ($announcements as $announcement)
              <article style="border-left:2px solid {{ $loop->first ? 'var(--copper)' : 'var(--line-2)' }};padding-left:12px">
                <p class="row-sub" style="margin:0 0 3px">{{ $announcement->author->firstName() }} &middot; {{ $announcement->created_at->diffForHumans() }}</p>
                <p style="font-size:14px;line-height:1.5;color:var(--ink-2)">{{ $announcement->body }}</p>
              </article>
            @endforeach
          </div>
        @endif
      </section>

      @if ($messages->isNotEmpty())
        <section class="card card__pad" data-reveal>
          <h2 class="card__title" style="margin-bottom:12px">Messages</h2>
          <div style="display:grid;gap:13px">
            @foreach ($messages as $message)
              <article style="border-left:2px solid {{ $message->read_at ? 'var(--line-2)' : 'var(--copper)' }};padding-left:12px">
                <p class="row-sub" style="margin:0 0 3px">{{ $message->sender->firstName() }} &middot; {{ $message->created_at->diffForHumans() }}</p>
                <p style="font-size:14px;line-height:1.5;color:var(--ink-2)">{{ $message->body }}</p>
              </article>
            @endforeach
          </div>
        </section>
      @endif

      <section class="card card__pad" data-reveal>
        <h2 class="card__title">Waiting for sign-off</h2>
        <p class="card__note" style="margin-bottom:12px">Your instructor checks these against the performance criteria.</p>
        @if ($awaitingSignOff->isEmpty())
          <p style="font-size:14px;color:var(--ink-2)">Nothing waiting. Submit a job sheet and it shows up here.</p>
        @else
          <ul style="list-style:none;margin:0;padding:0;display:grid;gap:10px">
            @foreach ($awaitingSignOff as $submission)
              <li style="display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.4"><span class="badge--dot" style="color:var(--caution);margin-top:6px"></span><span>{{ $submission->label }}<span class="row-sub">Submitted {{ $submission->submitted_at->format('j F') }}</span></span></li>
            @endforeach
          </ul>
        @endif
      </section>

      <section class="card card--flat card__pad" data-reveal>
        <h2 class="card__title">Saved on this phone</h2>
        <p style="margin-top:4px;font-size:13.5px;line-height:1.5;color:var(--ink-2)">About {{ $savedPages }} pages you have opened stay readable offline. Quiz answers upload the next time you connect.</p>
      </section>
    </div>
  </div>
</main>

<nav class="bottomnav" aria-label="Main">
  <a href="{{ route('student.dashboard') }}" aria-current="page"><svg width="20" height="20" viewBox="0 0 15 15" aria-hidden="true"><rect x="1" y="1" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect><path d="M1 6 H14" stroke="currentColor" stroke-width="1.6"></path></svg>Home</a>
  <a href="{{ route('student.modules.index') }}"><svg width="20" height="20" viewBox="0 0 15 15" aria-hidden="true"><path d="M2 2 H13 V13 H2 Z M2 5 H13 M5 5 V13" fill="none" stroke="currentColor" stroke-width="1.4"></path></svg>Modules</a>
  <a href="{{ route('student.quizzes.index') }}"><svg width="20" height="20" viewBox="0 0 15 15" aria-hidden="true"><circle cx="7.5" cy="7.5" r="6" fill="none" stroke="currentColor" stroke-width="1.4"></circle><path d="M4.5 7.8 L6.6 10 L10.5 5.5" fill="none" stroke="currentColor" stroke-width="1.4"></path></svg>Quizzes</a>
  <a href="{{ route('student.simulations.index') }}"><svg width="20" height="20" viewBox="0 0 15 15" aria-hidden="true"><path d="M1 7.5 H4 M11 7.5 H14" stroke="currentColor" stroke-width="1.4"></path><rect x="4" y="5" width="7" height="5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"></rect><path d="M6.3 5 V10 M8.7 5 V10" stroke="currentColor" stroke-width="1.2"></path></svg>Labs</a>
</nav>
@endsection
