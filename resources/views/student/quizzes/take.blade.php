@extends('layouts.dashboard')

@section('title', $quiz->title)

@section('main')
<main class="page page--narrow has-bottomnav">
  <a href="{{ route('student.quizzes.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All quizzes</a>
  <div class="overline" style="margin-bottom:4px">{{ $quiz->competency->code }} &middot; attempt {{ $attemptNumber }} of {{ $quiz->max_attempts }}</div>
  <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">{{ $quiz->title }}</h1>
  <p style="margin:6px 0 22px;font-size:14px;color:var(--ink-2)">{{ $quiz->items->count() }} items, no time limit. Pass mark is {{ $quiz->pass_mark }}%. Your answers save when you submit.</p>

  @if ($errors->any())
    <div role="alert" class="card__pad" style="margin-bottom:16px;background:var(--fail-tint);border:1px solid rgba(169,50,39,.4);border-left:3px solid var(--fail);border-radius:var(--r-sm);font-size:13.5px;color:#8A241C">Answer every item before you submit.</div>
  @endif

  <form method="post" action="{{ route('student.quizzes.submit', $quiz) }}"
    data-confirm="You have {{ $quiz->max_attempts - $attemptNumber }} {{ \Illuminate\Support\Str::plural('try', $quiz->max_attempts - $attemptNumber) }} left after this one."
    data-confirm-title="Submit your answers?" data-confirm-btn="Submit">
    @csrf
    <div class="stack stack--sm">
      @foreach ($quiz->items as $item)
        <fieldset class="card card__pad" style="margin:0;border-width:1px">
          <legend style="font-size:14.5px;font-weight:600;line-height:1.35;padding:0">{{ $item->number }}. {{ $item->stem }}</legend>
          <div style="display:grid;gap:8px;margin-top:12px">
            @foreach ($item->choices as $index => $choice)
              <label class="choice">
                <input type="radio" name="answers[{{ $item->id }}]" value="{{ $index }}" required>
                <span>{{ $choice }}</span>
              </label>
            @endforeach
          </div>
        </fieldset>
      @endforeach
    </div>
    <button type="submit" class="btn btn--primary btn--block" style="margin-top:18px;min-height:50px;font-size:16px">Submit answers</button>
  </form>
</main>
@endsection
