@extends('layouts.dashboard')

@section('title', $module->title)

@section('main')
<main class="page page--narrow">
  <a href="{{ route('instructor.lessons.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All lessons</a>
  <div class="overline" style="margin-bottom:4px">{{ $module->competency->code }} &middot; Module {{ $module->number }}</div>
  <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">{{ $module->title }}</h1>
  <p style="margin:6px 0 22px;font-size:14px;color:var(--ink-2)">{{ $module->pages->count() }} {{ \Illuminate\Support\Str::plural('page', $module->pages->count()) }}. Changes show the next time a student opens the module.</p>

  <div class="stack stack--sm">
    @foreach ($module->pages as $page)
      <section class="card card__pad">
        <span class="mono" style="font-size:12px;color:var(--muted)">Page {{ $page->number }}{{ $page->isSimulation() ? ' · simulation' : '' }}</span>
        <form method="post" action="{{ route('instructor.lessons.pages.update', $page) }}" style="display:grid;gap:10px;margin-top:8px" data-page-form>
          @csrf @method('PATCH')
          <input name="heading" value="{{ $page->heading }}" class="field" required maxlength="150" style="font-weight:600">
          @include('instructor.lessons.partials.page-type', ['page' => $page, 'idPrefix' => 'page-'.$page->id])
          <textarea name="body" class="field" rows="5" maxlength="8000" style="line-height:1.5" @if (! $page->isSimulation()) required @endif placeholder="{{ $page->isSimulation() ? 'Optional: a short intro the student reads above the lab' : '' }}">{{ $page->body }}</textarea>
          <button type="submit" class="btn btn--sm btn--dark" style="justify-self:start">Save page</button>
        </form>
        <form method="post" action="{{ route('instructor.lessons.pages.destroy', $page) }}" style="margin-top:8px" data-confirm="Page {{ $page->number }} will be removed and the rest renumbered." data-confirm-title="Delete this page?" data-confirm-btn="Delete" data-confirm-icon="warning">
          @csrf @method('DELETE')
          <button type="submit" class="btn btn--tiny btn--outline" style="--btn-bd:rgba(169,50,39,.4);--btn-fg:#8A241C">Delete page</button>
        </form>
      </section>
    @endforeach
  </div>

  <section class="card card--flat card--accent card__pad" style="margin-top:16px">
    <h2 class="card__title" style="font-size:15px;margin-bottom:12px">Add a page</h2>
    <form method="post" action="{{ route('instructor.lessons.pages.store', $module) }}" style="display:grid;gap:10px" data-page-form>
      @csrf
      <input name="heading" value="{{ old('heading') }}" class="field" required maxlength="150" placeholder="Page heading" style="font-weight:600">
      @error('heading')<p class="field-error">{{ $message }}</p>@enderror
      @include('instructor.lessons.partials.page-type', ['page' => null, 'idPrefix' => 'new'])
      @error('simulation_key')<p class="field-error">{{ $message }}</p>@enderror
      <textarea name="body" class="field" rows="5" maxlength="8000" placeholder="What the student reads on this page" style="line-height:1.5" @if (old('type') !== 'simulation') required @endif>{{ old('body') }}</textarea>
      @error('body')<p class="field-error">{{ $message }}</p>@enderror
      <button type="submit" class="btn btn--primary" style="justify-self:start">Add page</button>
    </form>
  </section>
</main>
@endsection

@push('scripts')
<script>
// A simulation page needs no body text; a text page does. Keep the textarea's
// "required" in step with the chosen type.
(function () {
  document.querySelectorAll('[data-page-form]').forEach(function (form) {
    var type = form.querySelector('[name="type"]');
    var lab = form.querySelector('[data-simulation-picker]');
    var body = form.querySelector('textarea[name="body"]');
    if (!type || !body) { return; }
    var sync = function () {
      var isSim = type.value === 'simulation';
      body.required = !isSim;
      body.placeholder = isSim ? 'Optional: a short intro the student reads above the lab' : 'What the student reads on this page';
      if (lab) { lab.hidden = !isSim; lab.querySelector('select').required = isSim; }
    };
    type.addEventListener('change', sync);
    sync();
  });
})();
</script>
@endpush
