@extends('layouts.dashboard')

@section('title', $quiz->title)

@section('main')
<main class="page page--narrow">
  <a href="{{ route('instructor.quizzes.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All quizzes</a>
  <div class="overline" style="margin-bottom:4px">{{ $quiz->competency->code }}</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px">
    <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">{{ $quiz->title }}</h1>
    <span class="badge {{ $quiz->is_published ? 'badge--pass' : '' }}">{{ $quiz->is_published ? 'Published' : 'Draft' }}</span>
  </div>
  <p style="margin:0 0 20px;font-size:14px;color:var(--ink-2)">{{ $quiz->items->count() }} {{ \Illuminate\Support\Str::plural('item', $quiz->items->count()) }}. Publishing needs at least one item and one assigned section.</p>

  <form method="post" action="{{ route('instructor.quizzes.publish', $quiz) }}" style="margin-bottom:22px"
    data-confirm="{{ $quiz->is_published ? 'Students will no longer be able to open this quiz.' : 'The assigned sections can start taking this quiz right away.' }}"
    data-confirm-title="{{ $quiz->is_published ? 'Unpublish this quiz?' : 'Publish this quiz?' }}"
    data-confirm-btn="{{ $quiz->is_published ? 'Unpublish' : 'Publish' }}"
    data-confirm-icon="{{ $quiz->is_published ? 'warning' : 'question' }}">
    @csrf
    <button type="submit" class="btn {{ $quiz->is_published ? 'btn--outline' : 'btn--pass' }}">{{ $quiz->is_published ? 'Unpublish' : 'Publish quiz' }}</button>
  </form>

  <section class="card card__pad" style="margin-bottom:16px">
    <h2 class="card__title" style="font-size:15px;margin-bottom:12px">Settings</h2>
    <form method="post" action="{{ route('instructor.quizzes.update', $quiz) }}" style="display:grid;gap:12px">
      @csrf @method('PATCH')
      <input name="title" value="{{ $quiz->title }}" class="field" required maxlength="150" style="font-weight:600">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label style="font-size:13px;color:var(--ink-2)">Pass mark %<input name="pass_mark" type="number" min="1" max="100" value="{{ $quiz->pass_mark }}" class="field" required style="margin-top:4px"></label>
        <label style="font-size:13px;color:var(--ink-2)">Max attempts<input name="max_attempts" type="number" min="1" max="9" value="{{ $quiz->max_attempts }}" class="field" required style="margin-top:4px"></label>
      </div>
      <div style="display:grid;gap:7px">
        <span style="font-size:13px;font-weight:600">Assigned sections</span>
        @foreach ($sections as $section)
          <label class="check" style="font-size:13.5px"><input type="checkbox" name="section_ids[]" value="{{ $section->id }}" @checked($quiz->sections->contains($section))> {{ $section->name }}</label>
        @endforeach
      </div>
      <button type="submit" class="btn btn--sm btn--dark" style="justify-self:start">Save settings</button>
    </form>
  </section>

  <h2 class="card__title" style="font-size:15px;margin-bottom:12px">Items</h2>
  <div class="stack stack--sm">
    @foreach ($quiz->items as $item)
      <section class="card card__pad">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <span style="font-size:14px;font-weight:600;line-height:1.35">{{ $item->number }}. {{ $item->stem }}</span>
          <form method="post" action="{{ route('instructor.quizzes.items.destroy', $item) }}" data-confirm="This item will be removed and the rest renumbered." data-confirm-title="Delete item {{ $item->number }}?" data-confirm-btn="Delete" data-confirm-icon="warning">
            @csrf @method('DELETE')
            <button type="submit" class="btn btn--tiny btn--outline" style="--btn-bd:rgba(169,50,39,.35);--btn-fg:#8A241C">Delete</button>
          </form>
        </div>
        <ul style="list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px">
          @foreach ($item->choices as $i => $choice)
            <li style="font-size:13px;color:{{ $i === $item->correct_index ? '#1E5C3D' : 'var(--ink-2)' }};{{ $i === $item->correct_index ? 'font-weight:600' : '' }}">{{ chr(65 + $i) }}. {{ $choice }}{{ $i === $item->correct_index ? '  ✓' : '' }}</li>
          @endforeach
        </ul>
      </section>
    @endforeach
  </div>

  <section class="card card__pad" style="margin-top:16px">
    <h3 class="card__title" style="font-size:14.5px;margin-bottom:4px">Draft items with AI</h3>
    <p style="margin:0 0 12px;font-size:13px;color:var(--ink-2)">Writes multiple-choice items for {{ $quiz->competency->code }} and adds them to the list above. Read every item and its answer before you publish. This can take up to a minute.</p>
    <form method="post" action="{{ route('instructor.quizzes.items.generate', $quiz) }}" style="display:grid;gap:10px"
      onsubmit="const b=this.querySelector('button');b.disabled=true;b.textContent='Writing items…'">
      @csrf
      <input name="focus" value="{{ old('focus') }}" class="field" maxlength="300" placeholder="Topic to focus on (optional), e.g. reading resistor colour codes">
      @error('focus')<p class="field-error">{{ $message }}</p>@enderror
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--ink-2)">Items
          <select name="count" class="field" style="width:auto;min-height:38px">
            @foreach ([3, 5, 10] as $n)
              <option value="{{ $n }}" @selected((int) old('count', 5) === $n)>{{ $n }}</option>
            @endforeach
          </select>
        </label>
        <button type="submit" class="btn btn--sm btn--dark">Generate items</button>
      </div>
    </form>
  </section>

  <section class="card card--flat card--accent card__pad" style="margin-top:16px">
    <h3 class="card__title" style="font-size:14.5px;margin-bottom:12px">Add an item</h3>
    <form method="post" action="{{ route('instructor.quizzes.items.store', $quiz) }}" style="display:grid;gap:10px">
      @csrf
      <textarea name="stem" class="field" rows="2" required maxlength="500" placeholder="Question">{{ old('stem') }}</textarea>
      @error('stem')<p class="field-error">{{ $message }}</p>@enderror
      @foreach (range(0, 3) as $i)
        <label style="display:flex;gap:9px;align-items:center;font-size:13.5px">
          <input type="radio" name="correct_index" value="{{ $i }}" @checked(old('correct_index', 0) == $i) required style="accent-color:var(--board);flex:none">
          <input name="choices[{{ $i }}]" value="{{ old('choices.'.$i) }}" class="field" required maxlength="200" placeholder="Choice {{ chr(65 + $i) }}" style="min-height:42px">
        </label>
      @endforeach
      @error('choices.*')<p class="field-error">Fill in all four choices.</p>@enderror
      <input name="rationale" value="{{ old('rationale') }}" class="field" maxlength="300" placeholder="Why the answer is right (shown after a wrong attempt)">
      <button type="submit" class="btn btn--sm btn--primary" style="justify-self:start">Add item</button>
    </form>
  </section>
</main>
@endsection
