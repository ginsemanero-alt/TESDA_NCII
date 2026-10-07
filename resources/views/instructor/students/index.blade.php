@extends('layouts.dashboard')

@section('title', 'Classes')

@section('main')
<main class="page page--mid">
  <a href="{{ route('instructor.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Dashboard</a>

  <div class="page-head page-head--row">
    <div>
      <h1 class="page-title">{{ $section->name }}</h1>
      <p class="page-sub">{{ $students->count() }} students, sorted by name</p>
    </div>
    <form method="get" action="{{ route('instructor.classes.index') }}" style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2)">
      <label for="section-switch">Section</label>
      <select id="section-switch" name="section" class="field" onchange="this.form.submit()" style="width:auto;min-height:40px;padding-top:8px;padding-bottom:8px">
        @foreach ($sections as $option)
          <option value="{{ $option->id }}" @selected($option->id === $section->id)>{{ $option->name }}</option>
        @endforeach
      </select>
    </form>
  </div>

  <section class="card">
    <ul class="list">
      @foreach ($students as $row)
        <li class="list__row">
          <span class="avatar avatar--sq">{{ $row['student']->initials() }}</span>
          <span class="grow" style="min-width:150px">
            <span class="row-title">{{ $row['student']->name }}</span>
            <span class="row-sub mono">{{ $row['student']->username }}@if ($row['pending']) &middot; <span style="color:#79510B">pending</span>@elseif ($row['locked']) &middot; <span style="color:#8A241C">locked</span>@endif</span>
          </span>
          <span style="display:flex;flex-direction:column;gap:4px;width:140px;flex:none">
            <span style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted)"><span>Progress</span><span class="tnum">{{ $row['percent'] }}%</span></span>
            <span class="meter meter--sm"><span class="meter__fill {{ $row['percent'] >= 50 ? 'meter__fill--pass' : ($row['percent'] >= 25 ? 'meter__fill--caution' : 'meter__fill--fail') }}" style="--v:{{ max($row['percent'],2) / 100 }}"></span></span>
          </span>
          <span style="font-size:13px;color:var(--ink-2);flex:none;width:78px;text-align:right">Quiz {{ $row['quiz_average'] !== null ? $row['quiz_average'].'%' : '—' }}</span>
          <span style="font-size:13px;color:var(--ink-2);flex:none;width:86px;text-align:right" title="{{ $row['simulation_best'] ? ($row['simulation_best']->simulation()?->title() ?? $row['simulation_best']->simulation_key) : 'No lab attempts yet' }}, best attempt" data-simulation-best>Lab {{ $row['simulation_best'] ? $row['simulation_best']->score.'/'.$row['simulation_best']->max_score : '—' }}</span>
          <button type="button" class="btn btn--tiny btn--outline" data-message="{{ $row['student']->id }}" data-message-name="{{ $row['student']->firstName() }}">Message</button>
        </li>
      @endforeach
    </ul>
  </section>
</main>
@endsection
