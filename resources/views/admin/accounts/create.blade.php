@extends('layouts.dashboard')

@section('title', 'Add account')

@section('main')
<main class="page" style="--page-w:560px">
  <a href="{{ route('admin.accounts.index') }}" class="crumb"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg> All accounts</a>
  <div class="page-head">
    <h1 class="page-title" style="font-size:clamp(20px,2.6vw,25px)">Add an account</h1>
    <p class="page-sub">A temporary password is generated. Hand it over in person — the user sets their own on first sign-in.</p>
  </div>

  <form method="post" action="{{ route('admin.accounts.store') }}" style="display:grid;gap:16px">
    @csrf
    <div>
      <label for="name" class="field-label">Full name</label>
      <input id="name" name="name" value="{{ old('name') }}" class="field" required maxlength="120" placeholder="Dela Cruz, Jhon Rey P.">
      @error('name')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <div>
      <label for="username" class="field-label">Username</label>
      <input id="username" name="username" value="{{ old('username') }}" class="field mono" required maxlength="40" placeholder="jhonrey.m">
      @error('username')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <div>
      <label for="role" class="field-label">Role</label>
      <select id="role" name="role" class="field" required onchange="document.getElementById('lrn-row').hidden = this.value !== 'student'; document.getElementById('section-row').hidden = this.value === 'admin';">
        <option value="student" @selected(old('role', 'student') === 'student')>Student</option>
        <option value="instructor" @selected(old('role') === 'instructor')>Instructor</option>
        <option value="admin" @selected(old('role') === 'admin')>Admin</option>
      </select>
    </div>
    <div id="lrn-row" @unless(old('role', 'student') === 'student') hidden @endunless>
      <label for="lrn" class="field-label">LRN</label>
      <input id="lrn" name="lrn" value="{{ old('lrn') }}" class="field mono" inputmode="numeric" maxlength="12" placeholder="12 digits">
      @error('lrn')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <div id="section-row" @if(old('role') === 'admin') hidden @endif>
      <label for="section_id" class="field-label">Section</label>
      <select id="section_id" name="section_id" class="field">
        <option value="">— none —</option>
        @foreach ($sections as $section)
          <option value="{{ $section->id }}" @selected(old('section_id') == $section->id)>{{ $section->name }}</option>
        @endforeach
      </select>
      @error('section_id')<p class="field-error">{{ $message }}</p>@enderror
    </div>
    <button type="submit" class="btn btn--primary" style="min-height:48px">Create account</button>
  </form>
</main>
@endsection
