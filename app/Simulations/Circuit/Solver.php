<?php

namespace App\Simulations\Circuit;

/**
 * DC solver for the circuit workbench, the server twin of
 * resources/js/simulations/circuit/lib/solver.ts. Same model, same order of
 * operations: nodal analysis with a dense Gaussian elimination, a Norton pair
 * for each source, a piecewise-linear LED, an ohmmeter answered with a test
 * current and the sources switched off.
 * tests/fixtures/circuit-vectors.json (worked by hand) checks both.
 *
 * Takes a document already cleaned by CircuitDocument::parse().
 */
final class Solver
{
    /**
     * @param  array<string, mixed>  $doc
     * @return array{elements: array<string, array<string, mixed>>, meters: array<string, array<string, mixed>>, flags: list<array{part: string, kind: string}>, nets: array<string, float>, netOf: array<string, string>}
     */
    public static function solve(array $doc): array
    {
        $ctx = self::context($doc);
        $leds = array_values(array_filter($doc['parts'], fn (array $p): bool => $p['type'] === 'led'));

        $ledOn = [];
        foreach ($leds as $part) {
            $ledOn[$part['id']] = false;
        }

        $v = self::nets($ctx, true, $ledOn, null);
        for ($pass = 0; $pass < 30; $pass++) {
            $changed = false;
            foreach ($leds as $part) {
                $vf = Parts::LED[$part['color']]['vf'];
                $vak = $v[self::net($ctx, $part, 'a')] - $v[self::net($ctx, $part, 'k')];
                $on = $ledOn[$part['id']];
                if (! $on && $vak > $vf) {
                    $ledOn[$part['id']] = true;
                    $changed = true;
                } elseif ($on && $vak < $vf) {
                    $ledOn[$part['id']] = false;
                    $changed = true;
                }
            }
            if (! $changed) {
                break;
            }
            $v = self::nets($ctx, true, $ledOn, null);
        }

        $elements = [];
        $meters = [];
        $flags = [];

        foreach ($doc['parts'] as $part) {
            $id = $part['id'];
            switch ($part['type']) {
                case 'resistor':
                    $vd = $v[self::net($ctx, $part, 'a')] - $v[self::net($ctx, $part, 'b')];
                    $i = $vd / $part['value'];
                    $p = $vd * $i;
                    $elements[$id] = ['v' => $vd, 'i' => $i, 'p' => $p];
                    if ($p > Parts::RESISTOR_WATTS) {
                        $flags[] = ['part' => $id, 'kind' => 'overheat'];
                    }
                    break;
                case 'switch':
                    $vd = $v[self::net($ctx, $part, 'a')] - $v[self::net($ctx, $part, 'b')];
                    $i = $part['closed'] ? $vd / Parts::SWITCH_CLOSED_OHMS : 0.0;
                    $elements[$id] = ['v' => $vd, 'i' => $i, 'p' => $vd * $i, 'on' => $part['closed']];
                    break;
                case 'battery':
                case 'supply':
                    $vt = $v[self::net($ctx, $part, '+')] - $v[self::net($ctx, $part, '-')];
                    $def = Parts::SOURCE[$part['type']];
                    $i = (self::sourceVolts($part) - $vt) / $def['r'];
                    $elements[$id] = ['v' => $vt, 'i' => $i, 'p' => -($vt * $i)];
                    if ($i > $def['max']) {
                        $flags[] = ['part' => $id, 'kind' => 'overload'];
                    }
                    break;
                case 'led':
                    $def = Parts::LED[$part['color']];
                    $vak = $v[self::net($ctx, $part, 'a')] - $v[self::net($ctx, $part, 'k')];
                    $on = $ledOn[$id];
                    $i = $on ? ($vak - $def['vf']) / Parts::LED_RS : 0.0;
                    $elements[$id] = ['v' => $vak, 'i' => $i, 'p' => $vak * $i, 'on' => $on];
                    if ($i > $def['max']) {
                        $flags[] = ['part' => $id, 'kind' => 'burnt'];
                    }
                    if ($vak < -Parts::LED_REVERSE_VOLTS) {
                        $flags[] = ['part' => $id, 'kind' => 'reverse'];
                    }
                    break;
                case 'meter':
                    $vd = $v[self::net($ctx, $part, 'v')] - $v[self::net($ctx, $part, 'com')];
                    if ($part['mode'] === 'V') {
                        $elements[$id] = ['v' => $vd, 'i' => $vd / Parts::VOLTMETER_OHMS, 'p' => 0.0];
                        $meters[$id] = ['mode' => 'V', 'value' => $vd];
                    } elseif ($part['mode'] === 'A') {
                        $i = $vd / Parts::AMMETER_OHMS;
                        $elements[$id] = ['v' => $vd, 'i' => $i, 'p' => $vd * $i];
                        if (abs($i) > Parts::FUSE_AMPS) {
                            $meters[$id] = ['mode' => 'A', 'value' => null, 'fault' => 'fuse'];
                            $flags[] = ['part' => $id, 'kind' => 'fuse'];
                        } else {
                            $meters[$id] = ['mode' => 'A', 'value' => $i];
                        }
                    } else {
                        $mode = $part['mode'];
                        if (abs($vd) > Parts::LIVE_VOLTS) {
                            $meters[$id] = ['mode' => $mode, 'value' => null, 'fault' => 'live'];
                            $elements[$id] = ['v' => $vd, 'i' => 0.0, 'p' => 0.0];
                            $flags[] = ['part' => $id, 'kind' => 'live'];
                        } else {
                            $off = [];
                            foreach ($leds as $led) {
                                $off[$led['id']] = false;
                            }
                            $into = self::net($ctx, $part, 'v');
                            $outOf = self::net($ctx, $part, 'com');
                            $test = self::nets($ctx, false, $off, ['into' => $into, 'outOf' => $outOf, 'amps' => Parts::TEST_AMPS]);
                            $ohms = ($test[$into] - $test[$outOf]) / Parts::TEST_AMPS;
                            $meters[$id] = $mode === 'cont'
                                ? ['mode' => $mode, 'value' => $ohms, 'beep' => $ohms < Parts::BEEP_OHMS]
                                : ['mode' => $mode, 'value' => $ohms];
                            $elements[$id] = ['v' => 0.0, 'i' => 0.0, 'p' => 0.0];
                        }
                    }
                    break;
            }
        }

        $nets = [];
        for ($n = 0; $n < $ctx['netCount']; $n++) {
            $nets["n{$n}"] = $v[$n];
        }
        $netOf = [];
        foreach ($ctx['net'] as $key => $n) {
            $netOf[$key] = "n{$n}";
        }

        return ['elements' => $elements, 'meters' => $meters, 'flags' => $flags, 'nets' => $nets, 'netOf' => $netOf];
    }

    /**
     * Resistance between two pins of an unpowered circuit, by the test-current method an ohmmeter uses.
     *
     * @param  array<string, mixed>  $doc
     */
    public static function resistanceBetween(array $doc, string $from, string $to): float
    {
        $ctx = self::context($doc);
        if (! isset($ctx['net'][$from], $ctx['net'][$to])) {
            return INF;
        }
        $off = [];
        foreach ($doc['parts'] as $part) {
            if ($part['type'] === 'led') {
                $off[$part['id']] = false;
            }
        }
        $a = $ctx['net'][$from];
        $b = $ctx['net'][$to];
        $test = self::nets($ctx, false, $off, ['into' => $a, 'outOf' => $b, 'amps' => Parts::TEST_AMPS]);

        return ($test[$a] - $test[$b]) / Parts::TEST_AMPS;
    }

    /** The voltage a source part is set to. */
    public static function sourceVolts(array $part): float
    {
        return $part['type'] === 'battery' ? Parts::BATTERY_VOLTS : (float) ($part['value'] ?? 0.0);
    }

    /* ------------------------------------------------------------------ */

    private static function find(array &$parent, int $i): int
    {
        while ($parent[$i] !== $i) {
            $parent[$i] = $parent[$parent[$i]];
            $i = $parent[$i];
        }

        return $i;
    }

    private static function union(array &$parent, int $a, int $b): void
    {
        $ra = self::find($parent, $a);
        $rb = self::find($parent, $b);
        // The smaller root wins, so net numbering matches the TypeScript solver.
        if ($ra < $rb) {
            $parent[$rb] = $ra;
        } elseif ($rb < $ra) {
            $parent[$ra] = $rb;
        }
    }

    /**
     * @param  array<string, mixed>  $doc
     * @return array{doc: array<string, mixed>, net: array<string, int>, netCount: int, unknown: list<int>, unknownCount: int}
     */
    private static function context(array $doc): array
    {
        $keys = [];
        foreach ($doc['parts'] as $part) {
            foreach (Parts::PINS[$part['type']] as $pin) {
                $keys[] = "{$part['id']}.{$pin}";
            }
        }
        $index = array_flip($keys);

        $pinParent = array_keys($keys);
        foreach ($doc['wires'] as $wire) {
            $a = $index["{$wire['from']['part']}.{$wire['from']['pin']}"] ?? null;
            $b = $index["{$wire['to']['part']}.{$wire['to']['pin']}"] ?? null;
            if ($a !== null && $b !== null) {
                self::union($pinParent, $a, $b);
            }
        }

        // Nets are numbered in order of first appearance among the pins.
        $netByRoot = [];
        $net = [];
        foreach ($keys as $i => $key) {
            $root = self::find($pinParent, $i);
            if (! isset($netByRoot[$root])) {
                $netByRoot[$root] = count($netByRoot);
            }
            $net[$key] = $netByRoot[$root];
        }
        $netCount = count($netByRoot);

        $islandParent = $netCount > 0 ? range(0, $netCount - 1) : [];
        foreach ($doc['parts'] as $part) {
            $pins = Parts::PINS[$part['type']];
            if (count($pins) === 2) {
                self::union($islandParent, $net["{$part['id']}.{$pins[0]}"], $net["{$part['id']}.{$pins[1]}"]);
            }
        }

        // Each island's reference: the negative terminal of its first source, else its lowest net.
        $reference = [];
        foreach ($doc['parts'] as $part) {
            if ($part['type'] === 'battery' || $part['type'] === 'supply') {
                $minus = $net["{$part['id']}.-"];
                $root = self::find($islandParent, $minus);
                if (! isset($reference[$root])) {
                    $reference[$root] = $minus;
                }
            }
        }
        for ($n = 0; $n < $netCount; $n++) {
            $root = self::find($islandParent, $n);
            if (! isset($reference[$root])) {
                $reference[$root] = $n;
            }
        }
        $refs = array_flip(array_values($reference));

        $unknown = [];
        $unknownCount = 0;
        for ($n = 0; $n < $netCount; $n++) {
            $unknown[] = isset($refs[$n]) ? -1 : $unknownCount++;
        }

        return ['doc' => $doc, 'net' => $net, 'netCount' => $netCount, 'unknown' => $unknown, 'unknownCount' => $unknownCount];
    }

    private static function net(array $ctx, array $part, string $pin): int
    {
        return $ctx['net']["{$part['id']}.{$pin}"];
    }

    /**
     * Net voltages (reference nets are 0).
     *
     * @param  array<string, bool>  $ledOn
     * @param  array{into: int, outOf: int, amps: float}|null  $test
     * @return list<float>
     */
    private static function nets(array $ctx, bool $powered, array $ledOn, ?array $test): array
    {
        $n = $ctx['unknownCount'];
        $g = $n > 0 ? array_fill(0, $n, array_fill(0, $n, 0.0)) : [];
        $rhs = $n > 0 ? array_fill(0, $n, 0.0) : [];
        $unknown = $ctx['unknown'];

        $conduct = function (int $a, int $b, float $siemens) use (&$g, $unknown): void {
            $ia = $unknown[$a];
            $ib = $unknown[$b];
            if ($ia >= 0) {
                $g[$ia][$ia] += $siemens;
            }
            if ($ib >= 0) {
                $g[$ib][$ib] += $siemens;
            }
            if ($ia >= 0 && $ib >= 0) {
                $g[$ia][$ib] -= $siemens;
                $g[$ib][$ia] -= $siemens;
            }
        };
        $inject = function (int $net, float $amps) use (&$rhs, $unknown): void {
            $i = $unknown[$net];
            if ($i >= 0) {
                $rhs[$i] += $amps;
            }
        };

        foreach ($ctx['doc']['parts'] as $part) {
            switch ($part['type']) {
                case 'resistor':
                    $conduct(self::net($ctx, $part, 'a'), self::net($ctx, $part, 'b'), 1 / $part['value']);
                    break;
                case 'switch':
                    if ($part['closed']) {
                        $conduct(self::net($ctx, $part, 'a'), self::net($ctx, $part, 'b'), 1 / Parts::SWITCH_CLOSED_OHMS);
                    }
                    break;
                case 'battery':
                case 'supply':
                    $plus = self::net($ctx, $part, '+');
                    $minus = self::net($ctx, $part, '-');
                    $r = Parts::SOURCE[$part['type']]['r'];
                    $conduct($plus, $minus, 1 / $r);
                    if ($powered) {
                        $amps = self::sourceVolts($part) / $r;
                        $inject($plus, $amps);
                        $inject($minus, -$amps);
                    }
                    break;
                case 'led':
                    if ($ledOn[$part['id']] ?? false) {
                        $a = self::net($ctx, $part, 'a');
                        $k = self::net($ctx, $part, 'k');
                        $siemens = 1 / Parts::LED_RS;
                        $conduct($a, $k, $siemens);
                        $amps = $siemens * Parts::LED[$part['color']]['vf'];
                        $inject($a, $amps);
                        $inject($k, -$amps);
                    }
                    break;
                case 'meter':
                    if ($part['mode'] === 'V') {
                        $conduct(self::net($ctx, $part, 'com'), self::net($ctx, $part, 'v'), 1 / Parts::VOLTMETER_OHMS);
                    } elseif ($part['mode'] === 'A') {
                        $conduct(self::net($ctx, $part, 'com'), self::net($ctx, $part, 'v'), 1 / Parts::AMMETER_OHMS);
                    }
                    break;
            }
        }

        if ($test !== null) {
            $inject($test['into'], $test['amps']);
            $inject($test['outOf'], -$test['amps']);
        }

        for ($net = 0; $net < $ctx['netCount']; $net++) {
            $i = $unknown[$net];
            if ($i >= 0) {
                $g[$i][$i] += Parts::GMIN;
            }
        }

        $x = $n > 0 ? self::gauss($g, $rhs) : [];
        $volts = [];
        for ($net = 0; $net < $ctx['netCount']; $net++) {
            $volts[] = $unknown[$net] >= 0 ? $x[$unknown[$net]] : 0.0;
        }

        return $volts;
    }

    /**
     * @param  list<list<float>>  $a
     * @param  list<float>  $b
     * @return list<float>
     */
    private static function gauss(array $a, array $b): array
    {
        $n = count($b);
        for ($k = 0; $k < $n; $k++) {
            $pivot = $k;
            $max = abs($a[$k][$k]);
            for ($i = $k + 1; $i < $n; $i++) {
                $value = abs($a[$i][$k]);
                if ($value > $max) {
                    $max = $value;
                    $pivot = $i;
                }
            }
            if ($pivot !== $k) {
                [$a[$k], $a[$pivot]] = [$a[$pivot], $a[$k]];
                [$b[$k], $b[$pivot]] = [$b[$pivot], $b[$k]];
            }
            $d = $a[$k][$k];
            for ($i = $k + 1; $i < $n; $i++) {
                $f = $a[$i][$k] / $d;
                if ($f === 0.0) {
                    continue;
                }
                for ($j = $k; $j < $n; $j++) {
                    $a[$i][$j] -= $f * $a[$k][$j];
                }
                $b[$i] -= $f * $b[$k];
            }
        }

        $x = array_fill(0, $n, 0.0);
        for ($i = $n - 1; $i >= 0; $i--) {
            $sum = $b[$i];
            for ($j = $i + 1; $j < $n; $j++) {
                $sum -= $a[$i][$j] * $x[$j];
            }
            $x[$i] = $sum / $a[$i][$i];
        }

        return $x;
    }
}
