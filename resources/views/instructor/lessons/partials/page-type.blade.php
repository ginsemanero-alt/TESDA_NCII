{{-- Page type picker. Expects $page (ModulePage|null), $idPrefix, and $simulations from the controller. --}}
@php
  $currentType = old('type', $page?->type ?? 'text');
  $currentKey = old('simulation_key', $page?->simulation_key);
@endphp
<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:13.5px;color:var(--ink-2)">
  <label for="{{ $idPrefix }}-type">Page type</label>
  <select id="{{ $idPrefix }}-type" name="type" class="field" style="width:auto;min-height:40px;padding-top:8px;padding-bottom:8px">
    <option value="text" @selected($currentType === 'text')>Text</option>
    <option value="simulation" @selected($currentType === 'simulation')>Simulation</option>
  </select>
  <span data-simulation-picker @if ($currentType !== 'simulation') hidden @endif><span style="display:inline-flex;gap:8px;align-items:center">
    <label for="{{ $idPrefix }}-sim">Lab</label>
    <select id="{{ $idPrefix }}-sim" name="simulation_key" class="field" style="width:auto;min-height:40px;padding-top:8px;padding-bottom:8px">
      @foreach ($simulations as $key => $simulation)
        <option value="{{ $key }}" @selected($currentKey === $key)>{{ $simulation->title() }} ({{ implode(', ', array_keys($simulation->units())) }})</option>
      @endforeach
    </select>
  </span></span>
</div>
