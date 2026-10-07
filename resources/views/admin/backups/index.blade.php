@extends('layouts.dashboard')

@section('title', 'Backups')

@section('main')
<main class="page page--narrow">
  <a href="{{ route('admin.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Overview</a>
  <div class="page-head">
    <h1 class="page-title">Backups</h1>
    <p class="page-sub">Copies of the whole database ({{ $driver }}). Keep a recent one off the server too.</p>
  </div>

  <form method="post" action="{{ route('admin.backups.store') }}" style="margin-bottom:22px" data-confirm="This copies the current database to the school server. It runs in the background." data-confirm-title="Back up now?" data-confirm-btn="Back up">
    @csrf
    <button type="submit" class="btn btn--dark">Back up now</button>
  </form>

  <section class="card">
    <div class="card__head"><h2 class="card__title">Saved backups</h2></div>
    @if ($files->isEmpty())
      <p class="card__pad" style="font-size:14px;color:var(--ink-2)">No backups yet. Run one above.</p>
    @else
      <ul class="list">
        @foreach ($files as $file)
          <li class="list__row">
            <span class="grow">
              <span class="row-title mono" style="font-size:13px">{{ $file['name'] }}</span>
              <span class="row-sub">{{ \Illuminate\Support\Carbon::createFromTimestamp($file['made_at'])->diffForHumans() }} &middot; {{ number_format($file['size'] / 1024, 0) }} KB</span>
            </span>
            <a href="{{ route('admin.backups.download', $file['name']) }}" class="btn btn--sm btn--outline">Download</a>
          </li>
        @endforeach
      </ul>
    @endif
  </section>

  <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:var(--ink-2)">A nightly backup runs automatically at 6:00 AM. This page is for taking one on demand — before a big change, or at the end of a grading period.</p>
</main>
@endsection
