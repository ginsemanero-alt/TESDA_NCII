@extends('layouts.dashboard')

@section('title', 'Overview')

@section('main')
<main class="page page--wide">

  <div class="page-head">
    <h1 class="page-title">Accounts and system</h1>
    <p class="page-sub">Rizal National High School</p>
  </div>

  <div class="stat-row" style="margin-bottom:clamp(16px,2.4vw,22px)" data-reveal>
    <div class="card stat">
      <p class="stat__label">Accounts</p>
      <p class="stat__value tnum">{{ $stats['accounts'] }}</p>
      <p class="stat__foot">{{ $stats['pending'] }} waiting for approval</p>
    </div>
    <div class="card stat">
      <p class="stat__label">Signed in today</p>
      <p class="stat__value tnum">{{ $stats['signed_in_today'] }}</p>
      <p class="stat__foot">From last sign-in time</p>
    </div>
    <div class="card stat stat--dark">
      <p class="stat__label">Storage used</p>
      <p class="stat__value tnum">3.1<small> GB</small></p>
      <div class="meter meter--sm meter--onDark" style="margin-top:9px"><span class="meter__fill" style="--v:.62"></span></div>
      <p class="stat__foot">62% of the 5 GB on the server</p>
    </div>
    <div class="card stat stat--warn">
      <p class="stat__label">Failed sign-ins today</p>
      <p class="stat__value tnum">{{ $stats['failed_today'] }}</p>
      <p class="stat__foot">Wrong password, locked, or pending</p>
    </div>
  </div>

  <div class="grid-2col">
    <div class="stack">
      <section class="card card__pad" data-reveal>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px">
          <h2 class="card__title">Users by role</h2>
          <a href="{{ route('admin.accounts.create') }}" class="btn btn--sm btn--dark">Add account</a>
        </div>
        <div style="display:grid;gap:14px">
          @php($maxRole = max(1, ...array_values($roleCounts)))
          @foreach ($roleCounts as $label => $count)
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:5px"><span style="font-weight:600">{{ $label }}</span><span class="tnum" style="color:var(--ink-2)">{{ $count }}</span></div>
              <div class="meter" style="height:10px"><span class="meter__fill {{ $loop->first ? 'meter__fill--board' : ($loop->last ? 'meter__fill--caution' : '') }}" style="--v:{{ $count / $maxRole }}"></span></div>
            </div>
          @endforeach
        </div>
      </section>

      <section class="card" data-reveal>
        <div class="card__head">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px">
            <h2 class="card__title">Find an account</h2>
            <a href="{{ route('admin.accounts.index') }}">All accounts &rarr;</a>
          </div>
          <form method="get" action="{{ route('admin.accounts.index') }}">
            <input name="q" value="{{ $search }}" class="field" aria-label="Search accounts" placeholder="Search by name, username, or LRN">
          </form>
        </div>
        <ul class="list">
          @forelse ($users as $account)
            <li class="list__row">
              <span class="avatar avatar--sq">{{ $account->initials() }}</span>
              <span class="grow" style="min-width:150px">
                <span class="row-title">{{ $account->name }}</span>
                <span class="row-sub mono">{{ $account->username }}</span>
              </span>
              <span style="font-size:13px;color:var(--ink-2);flex:none;text-transform:capitalize">{{ $account->role }}</span>
              <span class="row-sub" style="flex:none;margin:0">
                @if ($account->status === \App\Models\User::STATUS_LOCKED) Locked out
                @elseif ($account->status === \App\Models\User::STATUS_PENDING) Pending
                @elseif ($account->last_active_at) Seen {{ $account->last_active_at->diffForHumans() }}
                @else Never signed in @endif
              </span>
              <span style="display:flex;gap:7px;flex:none">
                @if ($account->status === \App\Models\User::STATUS_PENDING)
                  <form method="post" action="{{ route('admin.accounts.approve', $account) }}" data-confirm="{{ $account->name }} ({{ $account->username }}) can sign in and the modules open right away." data-confirm-title="Approve this account?" data-confirm-btn="Approve">@csrf<button type="submit" class="btn btn--sm btn--pass">Approve</button></form>
                @endif
                @if ($account->status === \App\Models\User::STATUS_LOCKED)
                  <form method="post" action="{{ route('admin.accounts.unlock', $account) }}" data-confirm="{{ $account->username }} can try signing in again." data-confirm-title="Unlock this account?" data-confirm-btn="Unlock">@csrf<button type="submit" class="btn btn--sm btn--danger">Unlock</button></form>
                @endif
                <form method="post" action="{{ route('admin.accounts.reset-password', $account) }}" data-confirm="Signs {{ $account->firstName() }} out everywhere and sets a temporary password. Progress is not touched." data-confirm-title="Reset this password?" data-confirm-btn="Reset password" data-confirm-icon="warning">@csrf<button type="submit" class="btn btn--sm btn--outline">Reset</button></form>
              </span>
            </li>
          @empty
            <li class="list__row"><span style="font-size:14px;color:var(--ink-2)">No accounts match &ldquo;{{ $search }}&rdquo;.</span></li>
          @endforelse
        </ul>
      </section>

      <section class="card" data-reveal>
        <div class="card__head">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:11px">
            <h2 class="card__title">Activity log</h2>
            <span class="card__note">Kept for 90 days</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            @foreach ($filters as $key => $label)
              <a href="{{ route('admin.dashboard', array_filter(['filter' => $key === 'all' ? null : $key, 'q' => $search ?: null])) }}" class="chip {{ $activeFilter === $key ? 'is-on' : '' }}">{{ $label }}</a>
            @endforeach
          </div>
        </div>
        @if ($log->isEmpty())
          <div class="empty"><p class="empty__title">Nothing under this filter</p><p class="empty__text">Try Everything, or check a different day.</p></div>
        @else
          <ul class="list">
            @foreach ($log as $entry)
              <li class="list__row" style="align-items:flex-start">
                <span class="mono" style="font-size:12.5px;color:var(--muted);flex:none;width:64px;padding-top:1px">{{ $entry->occurred_at->format('g:i A') }}</span>
                <span class="grow">
                  <span style="display:block;font-size:14px;line-height:1.4">{{ $entry->description }}</span>
                  <span class="row-sub">{{ $entry->actor }}</span>
                </span>
                <span class="row-sub" style="flex:none;margin:0;max-width:120px;text-align:right">{{ \Illuminate\Support\Str::limit($entry->device, 26) }}</span>
              </li>
            @endforeach
          </ul>
        @endif
      </section>
    </div>

    <div class="stack">
      <section class="card card__pad" data-reveal>
        <h2 class="card__title">What fills the storage</h2>
        <p class="card__note" style="margin:2px 0 14px">Illustrative breakdown of the 3.1 GB in use.</p>
        <div style="display:grid;gap:12px">
          @foreach ([['Job sheet photos from students', '1.9 GB', .61, ''], ['Module images and diagrams', '0.7 GB', .23, 'meter__fill--board'], ['Nightly backups, last 7', '0.4 GB', .13, ''], ['Quiz answers and scores', '0.1 GB', .03, 'meter__fill--pass']] as [$label, $size, $ratio, $cls])
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>{{ $label }}</span><span class="tnum" style="color:var(--ink-2)">{{ $size }}</span></div>
              <div class="meter"><span class="meter__fill {{ $cls }}" style="--v:{{ $ratio }}"></span></div>
            </div>
          @endforeach
        </div>
      </section>

      <section class="card card--flat card__pad" data-reveal>
        <h2 class="card__title">Backup</h2>
        <p style="margin:4px 0 12px;font-size:13.5px;line-height:1.5;color:var(--ink-2)">Runs every night at 6:00 AM to the external drive. Take one on demand before a big change.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <form method="post" action="{{ route('admin.backups.store') }}" data-confirm="This copies the current database to the school server." data-confirm-title="Back up now?" data-confirm-btn="Back up">@csrf<button type="submit" class="btn btn--sm btn--outline">Back up now</button></form>
          <a href="{{ route('admin.backups.index') }}" class="btn btn--sm btn--ghost">See all backups &rarr;</a>
        </div>
      </section>

      @if ($lockedUser)
        <section class="card card--flag card__pad" data-reveal>
          <h2 class="card__title">Needs a look</h2>
          <p style="margin:4px 0 12px;font-size:13.5px;line-height:1.5;color:var(--ink-2)">The account <span class="mono">{{ $lockedUser->username }}</span> is locked out after too many failed sign-ins. Probably a forgotten password.</p>
          <form method="post" action="{{ route('admin.accounts.unlock', $lockedUser) }}" data-confirm="{{ $lockedUser->username }} will be able to try signing in again." data-confirm-title="Unlock this account?" data-confirm-btn="Unlock">@csrf<button type="submit" class="btn btn--sm btn--danger">Unlock the account</button></form>
        </section>
      @endif
    </div>
  </div>
</main>
@endsection
