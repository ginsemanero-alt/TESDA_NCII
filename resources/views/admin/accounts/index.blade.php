@extends('layouts.dashboard')

@section('title', 'Accounts')

@section('main')
<main class="page page--wide">
  <a href="{{ route('admin.dashboard') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> Overview</a>

  <div class="page-head page-head--row">
    <div>
      <h1 class="page-title">Accounts</h1>
      <p class="page-sub">{{ $accounts->total() }} matching &middot; {{ $roleCounts['all'] }} total</p>
    </div>
    <a href="{{ route('admin.accounts.create') }}" class="btn btn--primary">Add account</a>
  </div>

  <form method="get" action="{{ route('admin.accounts.index') }}" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
    <input name="q" value="{{ $search }}" class="field" placeholder="Search by name, username, or LRN" style="flex:1;min-width:220px">
    <select name="role" class="field" onchange="this.form.submit()" style="width:auto">
      <option value="">All roles ({{ $roleCounts['all'] }})</option>
      <option value="student" @selected($role === 'student')>Students ({{ $roleCounts['student'] }})</option>
      <option value="instructor" @selected($role === 'instructor')>Instructors ({{ $roleCounts['instructor'] }})</option>
      <option value="admin" @selected($role === 'admin')>Admin ({{ $roleCounts['admin'] }})</option>
    </select>
    <button type="submit" class="btn btn--dark">Search</button>
  </form>

  <section class="card">
    <ul class="list">
      @forelse ($accounts as $account)
        <li class="list__row">
          <span class="avatar avatar--sq">{{ $account->initials() }}</span>
          <span class="grow" style="min-width:150px">
            <span class="row-title">{{ $account->name }}</span>
            <span class="row-sub mono">{{ $account->username }}{{ $account->section ? ' · '.$account->section->name : '' }}</span>
          </span>
          <span style="font-size:12.5px;color:var(--ink-2);flex:none;text-transform:capitalize;width:72px">{{ $account->role }}</span>
          <span class="row-sub" style="flex:none;margin:0;width:120px">
            @if ($account->status === \App\Models\User::STATUS_LOCKED) Locked out
            @elseif ($account->status === \App\Models\User::STATUS_PENDING) Pending
            @elseif ($account->last_active_at) Seen {{ $account->last_active_at->diffForHumans(short: true) }}
            @else Never in @endif
          </span>
          <span style="display:flex;gap:6px;flex:none">
            @if ($account->status === \App\Models\User::STATUS_PENDING)
              <form method="post" action="{{ route('admin.accounts.approve', $account) }}" data-confirm="{{ $account->username }} can sign in and the modules open right away." data-confirm-title="Approve {{ $account->username }}?" data-confirm-btn="Approve">@csrf<button type="submit" class="btn btn--tiny btn--pass">Approve</button></form>
            @endif
            @if ($account->status === \App\Models\User::STATUS_LOCKED)
              <form method="post" action="{{ route('admin.accounts.unlock', $account) }}" data-confirm="{{ $account->username }} can try signing in again." data-confirm-title="Unlock {{ $account->username }}?" data-confirm-btn="Unlock">@csrf<button type="submit" class="btn btn--tiny btn--danger">Unlock</button></form>
            @endif
            <form method="post" action="{{ route('admin.accounts.reset-password', $account) }}" data-confirm="Signs {{ $account->firstName() }} out everywhere and sets a temporary password. Progress is not touched." data-confirm-title="Reset {{ $account->username }}?" data-confirm-btn="Reset" data-confirm-icon="warning">@csrf<button type="submit" class="btn btn--tiny btn--outline">Reset</button></form>
          </span>
        </li>
      @empty
        <li class="list__row"><span style="font-size:14px;color:var(--ink-2)">No accounts match your search.</span></li>
      @endforelse
    </ul>
  </section>

  @if ($accounts->hasPages())
    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:16px;font-size:13.5px;color:var(--ink-2)">
      @if ($accounts->onFirstPage())<span class="muted">&larr; Previous</span>@else<a href="{{ $accounts->previousPageUrl() }}">&larr; Previous</a>@endif
      <span class="muted">Page {{ $accounts->currentPage() }} of {{ $accounts->lastPage() }}</span>
      @if ($accounts->hasMorePages())<a href="{{ $accounts->nextPageUrl() }}">Next &rarr;</a>@else<span class="muted">Next &rarr;</span>@endif
    </div>
  @endif
</main>
@endsection
