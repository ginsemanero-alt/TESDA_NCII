@extends('layouts.dashboard')

@section('title', $module->title)

@section('main')
<main class="page page--narrow has-bottomnav">
  <a href="{{ route('student.modules.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All modules</a>

  <div class="overline" style="margin-bottom:4px">{{ $module->competency->code }} &middot; Module {{ $module->number }}</div>
  <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">{{ $module->title }}</h1>

  <div style="display:flex;gap:3px;margin:16px 0 22px">
    @for ($i = 1; $i <= $pageCount; $i++)
      <span style="flex:1;height:4px;border-radius:var(--r-pill);background:{{ $i <= $pageNumber ? 'var(--copper)' : 'var(--paper-2)' }}"></span>
    @endfor
  </div>

  @if ($simulation)
    <article class="card card__pad--lg">
      <span class="badge" style="margin-bottom:10px;background:var(--copper-tint);color:var(--copper-dk)">Simulation</span>
      <h2 class="card__title" style="font-size:17px;margin-bottom:10px">{{ $page->heading }}</h2>
      @if (filled($page->body))
        <div class="prose">{{ $page->body }}</div>
      @endif
    </article>
    @include('partials.simulation-island', ['simulation' => $simulation, 'issued' => $issued, 'page' => $page])
  @else
    <article class="card card__pad--lg">
      <h2 class="card__title" style="font-size:17px;margin-bottom:14px">{{ $page->heading }}</h2>
      <div class="prose">{{ $page->body }}</div>
    </article>
  @endif

  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:18px">
    <div style="display:flex;gap:8px">
      @if ($pageNumber > 1)
        <a href="{{ route('student.modules.show', [$module, 'p' => $pageNumber - 1]) }}" class="btn btn--sm btn--outline">&larr; Previous</a>
      @endif
      @if ($pageNumber < $pageCount)
        <a href="{{ route('student.modules.show', [$module, 'p' => $pageNumber + 1]) }}" class="btn btn--sm btn--primary">Next page &rarr;</a>
      @endif
    </div>
    <span class="mono" style="font-size:12.5px;color:var(--muted)">Page {{ $pageNumber }} of {{ $pageCount }}</span>
  </div>

  @if ($pageNumber === $pageCount)
    <form method="post" action="{{ route('student.modules.complete', $module) }}" style="margin-top:16px"
      data-confirm="You have read all {{ $pageCount }} pages. Mark this module done and update your competency progress?"
      data-confirm-title="Mark module done?" data-confirm-btn="Mark done">
      @csrf
      <button type="submit" class="btn btn--pass btn--block" style="min-height:48px">
        {{ $progress->status === 'done' ? 'Module already done — mark again' : 'I have read this module, mark it done' }}
      </button>
    </form>
  @endif
</main>
@endsection
