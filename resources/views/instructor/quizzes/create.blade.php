@extends('layouts.dashboard')

@section('title', 'Build a quiz')

@section('main')
<main class="page" style="--page-w:620px">
  <a href="{{ route('instructor.quizzes.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All quizzes</a>
  <div class="page-head">
    <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">Build a quiz</h1>
    <p class="page-sub">Name it and pick the competency. You add items and publish on the next screen.</p>
  </div>

  <form method="post" action="{{ route('instructor.quizzes.store') }}" style="display:grid;gap:16px">
    @csrf
    <div>
      <label for="title" class="field-label">Title</label>
      <input id="title" name="title" value="{{ old('title') }}" class="field" required maxlength="150" placeholder="Self-check 3.1, soldering defects">
      @error('title')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <div>
      <label for="competency_id" class="field-label">Competency</label>
      <select id="competency_id" name="competency_id" class="field" required>
        @foreach ($competencies as $competency)
          <option value="{{ $competency->id }}" @selected(old('competency_id') == $competency->id)>{{ $competency->code }} — {{ $competency->short_title }}</option>
        @endforeach
      </select>
      @error('competency_id')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div>
        <label for="reference" class="field-label">Reference <span class="muted" style="font-weight:400">(optional)</span></label>
        <input id="reference" name="reference" value="{{ old('reference') }}" class="field" maxlength="60" placeholder="CBLM 3.1">
      </div>
      <div>
        <label for="pass_mark" class="field-label">Pass mark %</label>
        <input id="pass_mark" name="pass_mark" type="number" min="1" max="100" value="{{ old('pass_mark', 75) }}" class="field" required>
      </div>
    </div>
    <div>
      <span class="field-label">Assign to sections <span class="muted" style="font-weight:400">(you can change this later)</span></span>
      <div style="display:grid;gap:8px">
        @foreach ($sections as $section)
          <label class="choice"><input type="checkbox" name="section_ids[]" value="{{ $section->id }}" @checked(collect(old('section_ids'))->contains($section->id))> {{ $section->name }}</label>
        @endforeach
      </div>
    </div>
    <button type="submit" class="btn btn--primary" style="min-height:48px">Create and add items</button>
  </form>
</main>
@endsection
