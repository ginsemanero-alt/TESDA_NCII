@php($openSignup = old('form') === 'signup' || $errors->hasAny(['full_name', 'lrn', 'section']))
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in &middot; EPAS NC II</title>
<meta name="description" content="Sign in to EPAS NC II with the username your instructor gave you. Accounts are created by your instructor or the school admin.">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#E9EBE4;-webkit-font-smoothing:antialiased}
  a{color:#8A5228;text-decoration:none}
  a:hover{color:#0C120F}
  :focus-visible{outline:3px solid #B4703A;outline-offset:2px;border-radius:2px}
  [data-field]{width:100%;font-family:Archivo,sans-serif;font-size:16px;color:#0C120F;background:#FFFDF9;border:1.5px solid rgba(12,25,20,.24);border-radius:5px;transition:border-color 150ms linear,background-color 150ms linear}
  [data-field]:focus{border-color:#0F2A22;outline:3px solid #B4703A;outline-offset:1px}
  [data-field="error"]{border-color:#A93227;background:rgba(169,50,39,.05)}
  [data-tab]{font-family:Archivo,sans-serif;font-size:15px;font-weight:600;cursor:pointer;background:none;border:none;padding:11px 4px 12px;color:#5F6C66;border-bottom:2.5px solid transparent;transition:color 150ms linear,border-color 150ms linear}
  [data-tab="on"]{color:#0C120F;border-bottom-color:#B4703A}
  [data-btn]{font-family:Archivo,sans-serif;cursor:pointer;border:none;transition:transform 150ms cubic-bezier(.16,.84,.44,1),background-color 150ms linear}
  [data-btn]:hover{transform:translateY(-1px)}
  [data-btn]:active{transform:translateY(0) scale(.99)}
  .epas-aside-link:hover{color:#FFFFFF}
  @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes nudge{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  @keyframes trace{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}
</style>
</head>
<body>
<div style="--board:#0F2A22;--board2:#17392E;--paper:#E9EBE4;--paper2:#DEE1D8;--ink:#0C120F;--copper:#B4703A;--copper-dk:#8A5228;--pass:#2F7D55;--caution:#B07610;--fail:#A93227;--muted:#5F6C66;--e1:0 1px 2px rgba(12,25,20,.10);--e2:0 8px 20px -8px rgba(12,25,20,.22);--e3:0 26px 50px -18px rgba(12,25,20,.45);font-family:Archivo,'Helvetica Neue',Helvetica,sans-serif;color:var(--ink);min-height:100vh;display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">

  <aside style="background:var(--board);color:#E4E8E0;padding:clamp(24px,4vw,44px);display:flex;flex-direction:column;justify-content:space-between;gap:32px;position:relative;overflow:hidden">
    <div style="position:relative">
      <a href="{{ route('landing') }}" class="epas-aside-link" style="display:inline-flex;align-items:center;gap:10px;color:#E4E8E0;margin-bottom:clamp(28px,5vw,56px)">
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" style="flex:none;display:block"><rect x="1" y="1" width="28" height="28" rx="2" fill="#17392E"></rect><path d="M6 21 L6 15 L11 10 L24 10" fill="none" stroke="#B4703A" stroke-width="2"></path><circle cx="6" cy="21" r="2.4" fill="#DEE1D8"></circle><circle cx="24" cy="10" r="2.4" fill="#DEE1D8"></circle></svg>
        <span>
          <span style="display:block;font-weight:700;font-size:15px;line-height:1.1">EPAS NC II</span>
          <span style="display:block;font-size:11.5px;color:#9FAAA2;line-height:1.2">Rizal National High School</span>
        </span>
      </a>
      <h1 style="margin:0 0 14px;font-size:clamp(26px,3.4vw,38px);line-height:1.06;letter-spacing:-.025em;font-weight:700;max-width:22ch;text-wrap:pretty">Sign in to pick up where you stopped.</h1>
      <p style="margin:0;font-size:16px;line-height:1.55;color:#C6CEC6;max-width:36ch">Your progress, quiz scores, and sign-offs stay on your account, even if you switch phones.</p>
    </div>

    <div style="position:relative">
      <svg viewBox="0 0 320 130" width="100%" style="display:block;max-width:340px;opacity:.9" aria-hidden="true">
        <g fill="none" stroke="#B4703A" stroke-width="3">
          <path d="M8 122 L8 66 L44 30 L150 30" style="--len:210;stroke-dasharray:210;stroke-dashoffset:210;animation:trace 600ms cubic-bezier(.22,.72,.32,1) 200ms both"></path>
          <path d="M312 122 L312 76 L282 46 L232 46" style="--len:150;stroke-dasharray:150;stroke-dashoffset:150;animation:trace 600ms cubic-bezier(.22,.72,.32,1) 320ms both"></path>
        </g>
        <g style="animation:rise 300ms ease-out 700ms both">
          <rect x="150" y="16" width="82" height="28" rx="3" fill="#C6B79B"></rect>
          <rect x="162" y="16" width="8" height="28" fill="#6B4A2B"></rect>
          <rect x="176" y="16" width="8" height="28" fill="#15181A"></rect>
          <rect x="190" y="16" width="8" height="28" fill="#C4611B"></rect>
          <rect x="220" y="16" width="6" height="28" fill="#B4923A"></rect>
        </g>
        <circle cx="8" cy="122" r="6" fill="#D8DCD2"></circle><circle cx="312" cy="122" r="6" fill="#D8DCD2"></circle>
      </svg>
      <p style="margin:16px 0 0;font-size:13.5px;line-height:1.5;color:#9FAAA2;max-width:40ch">Accounts are created by your instructor or the school admin. Nobody outside the school can enroll here.</p>
    </div>
  </aside>

  <main style="padding:clamp(24px,4vw,48px) clamp(16px,4vw,44px);display:flex;flex-direction:column;justify-content:center;background:var(--paper)">
    <div style="width:100%;max-width:436px;margin:0 auto">

      @if (session('status'))
        <div role="status" style="display:flex;gap:10px;padding:12px 13px;margin-bottom:20px;background:rgba(47,125,85,.10);border:1px solid rgba(47,125,85,.4);border-left:3px solid var(--pass);border-radius:5px">
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="10" cy="10" r="9" fill="#2F7D55"></circle><path d="M5.6 10.4 L8.6 13.4 L14.4 6.9" fill="none" stroke="#fff" stroke-width="2"></path></svg>
          <p style="margin:0;font-size:13.5px;line-height:1.45;color:#215C3E">{{ session('status') }}</p>
        </div>
      @endif

      <div role="tablist" aria-label="Sign in or create an account" style="display:flex;gap:22px;border-bottom:1px solid rgba(12,25,20,.14);margin-bottom:24px">
        <button type="button" role="tab" id="epas-tab-signin" aria-controls="epas-panel-signin" aria-selected="{{ $openSignup ? 'false' : 'true' }}" data-tab="{{ $openSignup ? 'off' : 'on' }}" data-target="signin">Sign in</button>
        <button type="button" role="tab" id="epas-tab-signup" aria-controls="epas-panel-signup" aria-selected="{{ $openSignup ? 'true' : 'false' }}" data-tab="{{ $openSignup ? 'on' : 'off' }}" data-target="signup">Create account</button>
      </div>

      <div id="epas-panel-signin" role="tabpanel" aria-labelledby="epas-tab-signin" @if($openSignup) hidden @endif>
        <form method="post" action="{{ route('login') }}" style="display:grid;gap:16px">
          @csrf
          <input type="hidden" name="form" value="signin">
          <div>
            <label for="signin-username" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">Username</label>
            <input id="signin-username" name="username" value="{{ old('form') !== 'signup' ? old('username') : '' }}" data-field="{{ $errors->has('username') && ! $openSignup ? 'error' : '' }}" autocomplete="username" placeholder="jhonrey.m" required style="padding:13px 13px;min-height:48px">
            <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted)">The one written on the slip your instructor gave you.</p>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <label for="signin-password" style="font-size:14px;font-weight:600">Password</label>
              <button type="button" data-btn data-reveal-toggle="signin-password" style="background:none;font-size:13px;font-weight:600;color:var(--copper-dk);padding:2px 4px">Show password</button>
            </div>
            <input id="signin-password" name="password" type="password" data-field autocomplete="current-password" required style="padding:13px 13px;min-height:48px">
          </div>

          @if (! $openSignup && $errors->has('username'))
            <div role="alert" style="display:flex;gap:10px;padding:12px 13px;background:rgba(169,50,39,.07);border:1px solid rgba(169,50,39,.4);border-left:3px solid var(--fail);border-radius:5px;animation:nudge 260ms cubic-bezier(.36,.07,.19,.97) both">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="9" cy="9" r="8" fill="#A93227"></circle><path d="M9 4.6 V10" stroke="#fff" stroke-width="1.8"></path><circle cx="9" cy="12.8" r="1.1" fill="#fff"></circle></svg>
              <p style="margin:0;font-size:13.5px;line-height:1.45;color:#7D1F18">{{ $errors->first('username') }}</p>
            </div>
          @endif

          <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.4;cursor:pointer">
            <input type="checkbox" name="remember" value="1" checked style="width:20px;height:20px;margin:0;accent-color:#0F2A22;flex:none">
            <span>Keep me signed in on this phone<span style="display:block;font-size:12.5px;color:var(--muted)">Do not tick this on the shop computers.</span></span>
          </label>

          <button type="submit" data-btn style="min-height:52px;background:var(--copper);color:#FFF8F1;font-size:16.5px;font-weight:600;border-radius:5px;box-shadow:var(--e2)">Sign in</button>

          <p style="margin:0;font-size:13.5px;line-height:1.5;color:#39443E">Forgot your username or password? Ask Ma'am Villamor or Sir Delos Reyes sa electronics shop. They can reset it in one minute.</p>
        </form>
      </div>

      <div id="epas-panel-signup" role="tabpanel" aria-labelledby="epas-tab-signup" @unless($openSignup) hidden @endunless>
        <form method="post" action="{{ route('register') }}" style="display:grid;gap:16px">
          @csrf
          <input type="hidden" name="form" value="signup">
          <div style="display:flex;gap:10px;padding:12px 13px;background:var(--paper2);border-left:3px solid var(--copper);border-radius:5px">
            <p style="margin:0;font-size:13.5px;line-height:1.45;color:#33403A">Create an account only if your instructor told you to. They still have to approve it before the modules open, usually the same day.</p>
          </div>
          <div>
            <label for="signup-name" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">Full name</label>
            <input id="signup-name" name="full_name" value="{{ old('full_name') }}" data-field="{{ $errors->has('full_name') ? 'error' : '' }}" autocomplete="name" placeholder="Dela Cruz, Jhon Rey P." required style="padding:13px;min-height:48px">
            @error('full_name')<p style="margin:6px 0 0;font-size:12.5px;color:#8A241C">{{ $message }}</p>@enderror
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px">
            <div>
              <label for="signup-lrn" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">LRN</label>
              <input id="signup-lrn" name="lrn" value="{{ old('lrn') }}" data-field="{{ $errors->has('lrn') ? 'error' : '' }}" inputmode="numeric" maxlength="12" pattern="\d{12}" placeholder="12 digits" required style="padding:13px;min-height:48px;font-family:'IBM Plex Mono',monospace">
              @error('lrn')<p style="margin:6px 0 0;font-size:12.5px;color:#8A241C">{{ $message }}</p>@enderror
            </div>
            <div>
              <label for="signup-section" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">Section</label>
              <select id="signup-section" name="section" data-field="{{ $errors->has('section') ? 'error' : '' }}" required style="padding:13px;min-height:48px">
                @foreach ($sections as $section)
                  <option value="{{ $section->name }}" @selected(old('section') === $section->name)>{{ $section->name }}</option>
                @endforeach
              </select>
              @error('section')<p style="margin:6px 0 0;font-size:12.5px;color:#8A241C">{{ $message }}</p>@enderror
            </div>
          </div>
          <div>
            <label for="signup-password" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">Password</label>
            <input id="signup-password" name="password" data-field="{{ $errors->has('password') ? 'error' : '' }}" type="password" autocomplete="new-password" minlength="8" required style="padding:13px;min-height:48px">
            <p style="margin:6px 0 0;font-size:12.5px;color:{{ $errors->has('password') ? '#8A241C' : 'var(--muted)' }}">@error('password'){{ $message }}@else At least 8 characters. Do not use your LRN or your birthday.@enderror</p>
          </div>

          <button type="submit" data-btn style="min-height:52px;background:var(--copper);color:#FFF8F1;font-size:16.5px;font-weight:600;border-radius:5px;box-shadow:var(--e2)">Create account</button>
          <p style="margin:0;font-size:13px;line-height:1.5;color:var(--muted)">Already have an account? <a href="#" data-go-signin>Sign in instead</a></p>
        </form>
      </div>

    </div>
  </main>
</div>

<script>
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var panels = {
    signin: document.getElementById('epas-panel-signin'),
    signup: document.getElementById('epas-panel-signup')
  };

  var showTab = function (target) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-target') === target;
      tab.setAttribute('data-tab', active ? 'on' : 'off');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.keys(panels).forEach(function (key) { panels[key].hidden = key !== target; });
  };

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { showTab(tab.getAttribute('data-target')); });
  });

  var goSignin = document.querySelector('[data-go-signin]');
  if (goSignin) {
    goSignin.addEventListener('click', function (event) {
      event.preventDefault();
      showTab('signin');
      var first = panels.signin.querySelector('[data-field]');
      if (first) { first.focus(); }
    });
  }

  if (window.location.hash === '#create') { showTab('signup'); }

  document.querySelectorAll('[data-reveal-toggle]').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var input = document.getElementById(toggle.getAttribute('data-reveal-toggle'));
      if (!input) { return; }
      var revealed = input.type === 'text';
      input.type = revealed ? 'password' : 'text';
      toggle.textContent = revealed ? 'Show password' : 'Hide password';
    });
  });

  var lrn = document.getElementById('signup-lrn');
  if (lrn) {
    lrn.addEventListener('input', function () { lrn.value = lrn.value.replace(/\D/g, '').slice(0, 12); });
  }
})();
</script>
</body>
</html>
