<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title', 'Dashboard') &middot; EPAS NC II</title>
<meta name="robots" content="noindex">
<meta name="csrf-token" content="{{ csrf_token() }}">
@auth<meta name="message-url" content="{{ auth()->user()->isInstructor() ? route('instructor.messages.store') : '' }}">@endauth
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.26.25/sweetalert2.min.css">
<link rel="stylesheet" href="{{ asset('css/epas.css') }}">
<script>document.documentElement.classList.add('js');</script>
@stack('head')
</head>
<body>
<div class="app">

  @php
    $navRoutes = [
      'Dashboard' => 'student.dashboard',
      'Modules' => 'student.modules.index',
      'Quizzes' => auth()->user()->isInstructor() ? 'instructor.quizzes.index' : 'student.quizzes.index',
      'Simulations' => 'student.simulations.index',
      'Classes' => 'instructor.classes.index',
      'Lessons' => 'instructor.lessons.index',
      'Overview' => 'admin.dashboard',
      'Accounts' => 'admin.accounts.index',
      'Backups' => 'admin.backups.index',
    ];
  @endphp

  <header class="masthead">
    <a href="{{ route('landing') }}" class="masthead__brand">
      <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="3" fill="#17392E"></rect><path d="M6 21 L6 15 L11 10 L24 10" fill="none" stroke="#B4703A" stroke-width="2.2"></path><circle cx="6" cy="21" r="2.4" fill="#DEE1D8"></circle><circle cx="24" cy="10" r="2.4" fill="#DEE1D8"></circle></svg>
      EPAS NC II
    </a>
    <nav class="masthead__nav">
      @foreach ($navLinks ?? [] as $label => $active)
        <a href="{{ isset($navRoutes[$label]) ? route($navRoutes[$label]) : url()->current() }}" class="navitem" @if($active) aria-current="page" @endif>{{ $label }}</a>
      @endforeach
    </nav>
    <div class="masthead__user">
      <span class="role-tag">{{ auth()->user()->role }}</span>
      <span class="avatar" title="{{ auth()->user()->name }}">{{ auth()->user()->initials() }}</span>
      <form method="post" action="{{ route('logout') }}" style="margin:0" data-confirm="You will need your username and password to get back in." data-confirm-title="Sign out?" data-confirm-btn="Sign out" data-confirm-icon="question">
        @csrf
        <button type="submit" class="btn btn--sm" style="--btn-bg:rgba(255,255,255,.09);--btn-fg:#DDE5DD">Sign out</button>
      </form>
    </div>
  </header>

  @if (session('status') || session('notice'))
    <div id="epas-flash" class="flash" data-toast="{{ session('status') }}" data-notice="{{ session('notice') }}">
      <div class="flash__inner">
        <span class="badge--dot" style="color:var(--pass)"></span>
        {{ session('status') ?? session('notice') }}
      </div>
    </div>
  @endif

  @yield('main')
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.26.25/sweetalert2.min.js"></script>
@stack('scripts')
<script>
(function () {
  var reveal = document.querySelectorAll('[data-reveal]');
  var showAll = function () { reveal.forEach(function (n) { n.setAttribute('data-reveal', 'in'); }); };
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.setAttribute('data-reveal', 'in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });
    reveal.forEach(function (n) { io.observe(n); });
    setTimeout(showAll, 1400);
  }

  document.querySelectorAll('[data-accordion] [data-row]').forEach(function (row) {
    row.addEventListener('click', function () {
      var panel = document.getElementById(row.getAttribute('aria-controls'));
      var open = row.getAttribute('aria-expanded') === 'true';
      row.setAttribute('aria-expanded', open ? 'false' : 'true');
      var chev = row.querySelector('[data-chev]');
      if (chev) { chev.style.transform = open ? '' : 'rotate(180deg)'; }
      if (panel) { panel.hidden = open; }
    });
  });

  if (!window.Swal) { return; }

  var EpasSwal = Swal.mixin({
    buttonsStyling: false,
    reverseButtons: true,
    showClass: { popup: 'epas-swal-in', backdrop: 'swal2-backdrop-show' },
    hideClass: { popup: 'epas-swal-out' },
    customClass: { confirmButton: 'swal2-confirm', cancelButton: 'swal2-cancel' }
  });
  var EpasToast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false,
    timer: 4200, timerProgressBar: true, buttonsStyling: false,
    showClass: { popup: 'epas-toast-in' }, hideClass: { popup: 'epas-toast-out' },
    didOpen: function (el) {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  var flash = document.getElementById('epas-flash');
  if (flash) {
    var toastMsg = flash.getAttribute('data-toast');
    var noticeMsg = flash.getAttribute('data-notice');
    flash.remove();
    if (noticeMsg) {
      EpasSwal.fire({ icon: 'success', title: 'Done', text: noticeMsg, confirmButtonText: 'Got it' });
    } else if (toastMsg) {
      EpasToast.fire({ title: toastMsg });
    }
  }

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('form[data-confirm]');
    if (!form || form.dataset.confirmed === '1') { return; }
    event.preventDefault();
    var danger = form.dataset.confirmIcon === 'warning';
    EpasSwal.fire({
      title: form.dataset.confirmTitle || 'Are you sure?',
      text: form.dataset.confirm,
      icon: form.dataset.confirmIcon || 'question',
      showCancelButton: true,
      focusCancel: danger,
      confirmButtonText: form.dataset.confirmBtn || 'Yes, continue',
      cancelButtonText: 'Cancel',
      customClass: {
        confirmButton: danger ? 'swal2-confirm epas-danger' : 'swal2-confirm',
        cancelButton: 'swal2-cancel'
      }
    }).then(function (result) {
      if (result.isConfirmed) {
        form.dataset.confirmed = '1';
        if (typeof form.requestSubmit === 'function') { form.requestSubmit(); } else { form.submit(); }
      }
    });
  }, true);

  document.addEventListener('click', function (event) {
    var el = event.target.closest('[data-info]');
    if (!el) { return; }
    event.preventDefault();
    EpasSwal.fire({ icon: 'info', title: el.dataset.infoTitle || 'Coming soon', text: el.dataset.info, confirmButtonText: 'Got it' });
  });

  var messageUrlMeta = document.querySelector('meta[name="message-url"]');
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  document.addEventListener('click', function (event) {
    var el = event.target.closest('[data-message]');
    if (!el || !messageUrlMeta || !messageUrlMeta.content) { return; }
    event.preventDefault();
    EpasSwal.fire({
      title: 'Message ' + (el.dataset.messageName || 'this student'),
      input: 'textarea',
      inputPlaceholder: 'It shows on their dashboard and stays until they read it.',
      inputAttributes: { maxlength: 1000, rows: 4 },
      showCancelButton: true,
      confirmButtonText: 'Send message',
      cancelButtonText: 'Cancel',
      inputValidator: function (value) { return value ? undefined : 'Write something first.'; }
    }).then(function (result) {
      if (!result.isConfirmed) { return; }
      var form = document.createElement('form');
      form.method = 'post';
      form.action = messageUrlMeta.content;
      form.innerHTML =
        '<input type="hidden" name="_token" value="' + csrfMeta.content + '">' +
        '<input type="hidden" name="recipient_id" value="' + el.dataset.message + '">';
      var body = document.createElement('input');
      body.type = 'hidden'; body.name = 'body'; body.value = result.value;
      form.appendChild(body);
      document.body.appendChild(form);
      form.submit();
    });
  });
})();
</script>
</body>
</html>
