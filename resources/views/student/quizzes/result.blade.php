@extends('layouts.dashboard')

@section('title', 'Result')

@php($percent = $attempt->total > 0 ? (int) round($attempt->score / $attempt->total * 100) : 0)
@php($passed = $attempt->status === 'passed')

@section('main')
<main class="page page--narrow has-bottomnav">
  <a href="{{ route('student.quizzes.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All quizzes</a>

  <section class="card card__pad" style="margin:6px 0 22px;background:{{ $passed ? 'var(--pass-tint)' : 'var(--caution-tint)' }};border-color:{{ $passed ? 'rgba(47,125,85,.35)' : 'rgba(176,118,16,.4)' }};border-left:3px solid {{ $passed ? 'var(--pass)' : 'var(--caution)' }}">
    <div class="overline">{{ $quiz->competency->code }} &middot; attempt {{ $attempt->attempt_number }}</div>
    <h1 class="page-title" style="margin:4px 0 6px;font-size:22px">{{ $attempt->score }}/{{ $attempt->total }} &middot; {{ $percent }}%</h1>
    <p style="font-size:14px;color:var(--ink-2)">{{ $passed ? 'Passed. This counts toward the competency.' : "Not yet. Pass mark is {$quiz->pass_mark}%. Review the items below." }}
      @if ($attemptsLeft > 0 && ! $passed) You have {{ $attemptsLeft }} {{ \Illuminate\Support\Str::plural('try', $attemptsLeft) }} left. @endif
    </p>
  </section>

  <h2 class="card__title" style="margin-bottom:12px">Item review</h2>
  <div class="stack stack--sm">
    @foreach ($quiz->items as $item)
      @php($given = (int) $answers->get((string) $item->id, -1))
      @php($ok = $given === (int) $item->correct_index)
      <section class="card card__pad">
        <div style="display:flex;gap:8px;align-items:flex-start">
          @if ($ok)
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="8" cy="8" r="7" fill="#2F7D55"></circle><path d="M4.6 8.4 L7 10.8 L11.4 5.6" fill="none" stroke="#fff" stroke-width="1.8"></path></svg>
          @else
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="9" cy="9" r="8" fill="#A93227"></circle><path d="M6 6 L12 12 M12 6 L6 12" stroke="#fff" stroke-width="1.8"></path></svg>
          @endif
          <span style="font-size:14.5px;font-weight:600;line-height:1.35">{{ $item->number }}. {{ $item->stem }}</span>
        </div>
        <div style="display:grid;gap:6px;margin:10px 0 0;padding-left:26px">
          @foreach ($item->choices as $index => $choice)
            @php($isCorrect = $index === (int) $item->correct_index)
            @php($isGiven = $index === $given)
            <div style="font-size:13.5px;padding:8px 10px;border-radius:var(--r-xs);
              {{ $isCorrect ? 'background:var(--pass-tint);color:#1E5C3D;font-weight:600' : ($isGiven ? 'background:var(--fail-tint);color:#8A241C' : 'color:var(--ink-2)') }}">
              {{ $choice }}@if ($isCorrect) &nbsp;&mdash; correct @elseif ($isGiven) &nbsp;&mdash; your answer @endif
            </div>
          @endforeach
        </div>
        @if (! $ok && $item->rationale)
          <p style="margin:10px 0 0;padding-left:26px;font-size:13px;color:var(--muted)">{{ $item->rationale }}</p>
        @endif
      </section>
    @endforeach
  </div>

  <div style="display:flex;gap:10px;margin-top:20px">
    @if ($attemptsLeft > 0 && ! $passed)
      <a href="{{ route('student.quizzes.show', $quiz) }}" class="btn btn--primary">Try again</a>
    @endif
    <a href="{{ route('student.quizzes.index') }}" class="btn btn--outline">Back to quizzes</a>
  </div>
</main>
@endsection
