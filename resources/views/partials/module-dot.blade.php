@php($size = $size ?? 16)
@if ($status === 'done')
  <svg width="{{ $size }}" height="{{ $size }}" viewBox="0 0 16 16" aria-hidden="true" style="flex:none"><circle cx="8" cy="8" r="7" fill="#2F7D55"></circle><path d="M4.6 8.4 L7 10.8 L11.4 5.6" fill="none" stroke="#fff" stroke-width="1.8"></path></svg>
@elseif ($status === 'in_progress')
  <span style="width:{{ $size }}px;height:{{ $size }}px;border-radius:50%;border:3px solid var(--copper);flex:none"></span>
@else
  <span style="width:{{ $size }}px;height:{{ $size }}px;border-radius:50%;border:1.5px solid var(--line-2);flex:none"></span>
@endif
