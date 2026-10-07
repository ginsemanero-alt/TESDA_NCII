<?php

namespace Tests\Concerns;

use App\Simulations\Circuit\CircuitSandbox;
use App\Simulations\Circuit\Solver;

/**
 * Hand-made correct answers for the circuit challenges, worked independently of
 * the grader: each builds the intended circuit with the parts the challenge
 * issued and reads the expected value off the solver.
 */
trait SolvesCircuitChallenges
{
    protected static function wire(string $id, string $from, string $to): array
    {
        [$fp, $fpin] = explode('.', $from);
        [$tp, $tpin] = explode('.', $to);

        return ['id' => $id, 'from' => ['part' => $fp, 'pin' => $fpin], 'to' => ['part' => $tp, 'pin' => $tpin]];
    }

    /** @return array<string, mixed> */
    protected function correct(array $cp): array
    {
        $doc = $cp['doc'] ?? ['parts' => [], 'wires' => []];

        switch ($cp['type']) {
            case 'ohms_law':
                return ['amps' => $cp['volts'] / $cp['ohms']];

            case 'build_led':
                // R = (V - Vf) / 14 mA, less the 5 ohm and 0.2 ohm inside the LED and the supply.
                $vf = $cp['color'] === 'red' ? 1.9 : 2.1;
                $doc['parts'][] = ['id' => 'R1', 'type' => 'resistor', 'x' => -60, 'y' => -80, 'rot' => 0, 'value' => round(($cp['volts'] - $vf) / 0.014 - 5.2)];
                array_push($doc['wires'], self::wire('w1', 'V1.+', 'R1.a'), self::wire('w2', 'R1.b', 'D1.a'), self::wire('w3', 'D1.k', 'V1.-'));

                return ['doc' => $doc];

            case 'measure_voltage':
                $expected = $this->expectedVoltage($cp);
                $doc['wires'][] = self::wire('w4', 'M1.v', $cp['target'].'.a');
                $doc['wires'][] = self::wire('w5', 'M1.com', $cp['target'].'.b');

                return ['doc' => $doc, 'volts' => $expected];

            case 'measure_current':
                $doc['wires'] = array_values(array_filter($doc['wires'], fn (array $w): bool => $w['id'] !== 'w2'));
                array_push($doc['wires'], self::wire('w5', 'R1.a', 'M1.v'), self::wire('w6', 'M1.com', 'R2.b'));
                $loop = Solver::solve(['parts' => [
                    ['id' => 'B1', 'type' => 'battery', 'value' => 9.0],
                    ['id' => 'R1', 'type' => 'resistor', 'value' => (float) $cp['r1']],
                    ['id' => 'R2', 'type' => 'resistor', 'value' => (float) $cp['r2']],
                ], 'wires' => [self::wire('a', 'B1.+', 'R1.a'), self::wire('b', 'R1.b', 'R2.a'), self::wire('c', 'R2.b', 'B1.-')]]);

                return ['doc' => $doc, 'amps' => $loop['elements']['R1']['i']];

            case 'troubleshoot':
                if ((new CircuitSandbox)->causeOf($cp) === 'big') {
                    $doc['parts'] = array_map(fn (array $p): array => $p['id'] === 'R1' ? [...$p, 'value' => 330.0] : $p, $doc['parts']);
                } else {
                    $doc['wires'] = array_values(array_filter($doc['wires'], fn (array $w): bool => ! in_array($w['id'], ['w2', 'w3'], true)));
                    array_push($doc['wires'], self::wire('w2', 'R1.b', 'D1.a'), self::wire('w3', 'D1.k', 'J1.j'));
                }

                return ['doc' => $doc, 'cause' => (new CircuitSandbox)->causeOf($cp)];

            default: // parallel
                $second = $cp['r1'] * $cp['target'] / ($cp['r1'] - $cp['target']);
                $doc['parts'][] = ['id' => 'R2', 'type' => 'resistor', 'x' => 80, 'y' => -40, 'rot' => 90, 'value' => $second];
                array_push($doc['wires'], self::wire('w1', 'R1.a', 'R2.a'), self::wire('w2', 'R1.b', 'R2.b'));

                return ['doc' => $doc, 'ohms' => $cp['target']];
        }
    }

    protected function expectedVoltage(array $cp): float
    {
        $loop = Solver::solve(['parts' => [
            ['id' => 'B1', 'type' => 'battery', 'value' => 9.0],
            ['id' => 'R1', 'type' => 'resistor', 'value' => (float) $cp['r1']],
            ['id' => 'R2', 'type' => 'resistor', 'value' => (float) $cp['r2']],
        ], 'wires' => [self::wire('a', 'B1.+', 'R1.a'), self::wire('b', 'R1.b', 'R2.a'), self::wire('c', 'R2.b', 'B1.-')]]);

        return $loop['elements'][$cp['target']]['v'];
    }
}
