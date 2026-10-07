<?php

namespace App\Simulations\Circuit;

use App\Simulations\Resistor\ColorCode;
use App\Simulations\Simulation;

/**
 * The circuit workbench: an open board where the student drags parts, wires
 * them and measures, plus graded challenges. Five of six challenge types are
 * issued per visit with fresh numbers; every answer is re-solved here with
 * Solver (the twin of the browser's solver), so a circuit the student built is
 * judged by what it actually does, not by what the browser says.
 *
 * Challenge → TESDA EPAS NC II (TR p.1 codes):
 *  - build_led        ELC724202  build and connect a working circuit; size the resistor (Ohm's law)
 *  - measure_voltage  ELC724205  2.4.6 / 2.4.8  measure voltage with a meter placed across a part
 *  - measure_current  ELC724205  2.4.8          measure current with the meter in series
 *  - ohms_law         ELC311201  2.3, 2.6       calculate current from voltage and resistance
 *  - troubleshoot     ELC724202  3 (test connections) / ELC724336 servicing: name the fault, then fix it
 *  - parallel         ELC724205  2.4.10         build a parallel pair for a target resistance
 */
final class CircuitSandbox implements Simulation
{
    public const KEY = 'circuit-sandbox';

    private const POOL = ['build_led', 'measure_voltage', 'measure_current', 'ohms_law', 'troubleshoot', 'parallel'];

    private const UNIT = [
        'build_led' => 'ELC724202',
        'measure_voltage' => 'ELC724205',
        'measure_current' => 'ELC724205',
        'ohms_law' => 'ELC311201',
        'troubleshoot' => 'ELC724202',
        'parallel' => 'ELC724205',
    ];

    /** Resistors a challenge may use: common bench values. */
    private const BENCH = [100, 220, 330, 470, 680, 1000, 2200, 4700, 10000];

    private const PARALLEL_VALUES = [220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800, 10000];

    /** The LED current a good circuit aims for: from, to (amperes). */
    private const LED_BAND = [0.008, 0.02];

    private const FIX_BAND = [0.008, 0.025];

    /** Relative error accepted on a number the student reads off the meter or works out. */
    private const READING_TOLERANCE = 0.03;

    private const CALC_TOLERANCE = 0.02;

    public function key(): string
    {
        return self::KEY;
    }

    public function title(): string
    {
        return 'Circuit workbench';
    }

    public function summary(): string
    {
        return 'An open bench: drag a battery, resistors, an LED, a switch and a multimeter onto the board, wire them, and watch the circuit run. Then take five challenges: build, measure, calculate and fix.';
    }

    public function units(): array
    {
        return [
            'ELC724202' => 'Terminate and connect electrical wiring and electronic circuits',
            'ELC724205' => 'Test electronic components',
            'ELC311201' => 'Perform mensuration and calculation',
        ];
    }

    public function entry(): string
    {
        return 'resources/js/simulations/circuit/index.tsx';
    }

    public function css(): string
    {
        return 'resources/css/simulations/labs.css';
    }

    public function assetPath(): string
    {
        return 'simulations/circuit';
    }

    public function reportsLocalScore(): bool
    {
        return false;
    }

    /* ------------------------------------------------------------------ */
    /* Issuing                                                             */
    /* ------------------------------------------------------------------ */

    public function checkpoints(): array
    {
        $types = self::POOL;
        shuffle($types);
        $types = array_slice($types, 0, 5);
        usort($types, fn (string $a, string $b): int => array_search($a, self::POOL, true) <=> array_search($b, self::POOL, true));

        $checkpoints = [];
        foreach ($types as $index => $type) {
            $checkpoints[] = $this->challenge($type, 'c'.($index + 1));
        }

        return $checkpoints;
    }

    /**
     * One challenge of the given type with fresh numbers. checkpoints() draws five of these;
     * it is public so tests can ask for a specific type.
     *
     * @return array<string, mixed>
     */
    public function challenge(string $type, string $id = 'c1'): array
    {
        return ['id' => $id, 'type' => $type, 'unit' => self::UNIT[$type]] + $this->issue($type);
    }

    /**
     * @return array<string, mixed>
     */
    private function issue(string $type): array
    {
        switch ($type) {
            case 'build_led':
                $volts = [5, 9, 12][random_int(0, 2)];
                $color = ['red', 'green'][random_int(0, 1)];

                return [
                    'volts' => $volts,
                    'color' => $color,
                    'min' => self::LED_BAND[0],
                    'max' => self::LED_BAND[1],
                    'doc' => [
                        'parts' => [
                            ['id' => 'V1', 'type' => 'supply', 'x' => -160, 'y' => 0, 'rot' => 90, 'value' => $volts],
                            ['id' => 'D1', 'type' => 'led', 'x' => 60, 'y' => -80, 'rot' => 0, 'color' => $color],
                        ],
                        'wires' => [],
                    ],
                ];

            case 'measure_voltage':
                $r1 = self::BENCH[random_int(0, count(self::BENCH) - 1)];
                $r2 = self::BENCH[random_int(0, count(self::BENCH) - 1)];

                return [
                    'r1' => $r1,
                    'r2' => $r2,
                    'target' => ['R1', 'R2'][random_int(0, 1)],
                    'doc' => [
                        'parts' => [
                            ['id' => 'B1', 'type' => 'battery', 'x' => 160, 'y' => 0, 'rot' => 90, 'value' => 9],
                            ['id' => 'R1', 'type' => 'resistor', 'x' => 0, 'y' => -40, 'rot' => 90, 'value' => $r1],
                            ['id' => 'R2', 'type' => 'resistor', 'x' => 0, 'y' => 40, 'rot' => 90, 'value' => $r2],
                            ['id' => 'M1', 'type' => 'meter', 'x' => -170, 'y' => 30, 'rot' => 270, 'mode' => 'V'],
                        ],
                        'wires' => [
                            self::wire('w1', 'B1.+', 'R1.a'),
                            self::wire('w2', 'R1.b', 'R2.a'),
                            self::wire('w3', 'R2.b', 'B1.-'),
                        ],
                    ],
                ];

            case 'measure_current':
                $r1 = self::BENCH[random_int(0, count(self::BENCH) - 1)];
                $r2 = self::BENCH[random_int(0, count(self::BENCH) - 1)];

                return [
                    'r1' => $r1,
                    'r2' => $r2,
                    'doc' => [
                        'parts' => [
                            ['id' => 'B1', 'type' => 'battery', 'x' => 200, 'y' => 0, 'rot' => 90, 'value' => 9],
                            ['id' => 'R1', 'type' => 'resistor', 'x' => 120, 'y' => -80, 'rot' => 0, 'value' => $r1],
                            ['id' => 'R2', 'type' => 'resistor', 'x' => -40, 'y' => -80, 'rot' => 0, 'value' => $r2],
                            ['id' => 'J1', 'type' => 'junction', 'x' => -80, 'y' => 40, 'rot' => 0],
                            ['id' => 'M1', 'type' => 'meter', 'x' => 40, 'y' => -220, 'rot' => 0, 'mode' => 'A'],
                        ],
                        'wires' => [
                            self::wire('w1', 'B1.+', 'R1.b'),
                            self::wire('w2', 'R1.a', 'R2.b'),
                            self::wire('w3', 'R2.a', 'J1.j'),
                            self::wire('w4', 'J1.j', 'B1.-'),
                        ],
                    ],
                ];

            case 'ohms_law':
                return [
                    'volts' => [3, 5, 6, 9, 12][random_int(0, 4)],
                    'ohms' => [100, 150, 220, 330, 470, 680, 1000, 2200, 4700][random_int(0, 8)],
                ];

            case 'troubleshoot':
                $variant = ['reversed', 'open', 'big'][random_int(0, 2)];

                return [
                    'symptom' => [
                        'reversed' => 'The LED does not light.',
                        'open' => 'Nothing happens: the LED stays dark and no current flows.',
                        'big' => 'The LED glows, but only very faintly.',
                    ][$variant],
                    'options' => [
                        ['value' => 'reversed', 'label' => 'The LED is fitted backwards'],
                        ['value' => 'open', 'label' => 'A wire is missing, so the loop is open'],
                        ['value' => 'big', 'label' => 'The resistor value is far too large'],
                        ['value' => 'flat', 'label' => 'The battery is flat'],
                    ],
                    'min' => self::FIX_BAND[0],
                    'max' => self::FIX_BAND[1],
                    'doc' => $this->faultyDoc($variant),
                ];

            default: // parallel
                $values = self::PARALLEL_VALUES;
                $a = $values[random_int(0, count($values) - 1)];
                do {
                    $b = $values[random_int(0, count($values) - 1)];
                } while ($b === $a);

                return [
                    'r1' => $a,
                    // Three significant figures: close enough that a standard value reaches it.
                    'target' => (float) sprintf('%.3g', $a * $b / ($a + $b)),
                    'doc' => [
                        'parts' => [
                            ['id' => 'R1', 'type' => 'resistor', 'x' => 0, 'y' => -40, 'rot' => 90, 'value' => $a],
                            ['id' => 'M1', 'type' => 'meter', 'x' => -170, 'y' => -10, 'rot' => 270, 'mode' => 'ohm'],
                        ],
                        'wires' => [],
                    ],
                ];
        }
    }

    /**
     * What is wrong with the issued circuit, read off the circuit itself, so the
     * answer never has to travel to the browser.
     *
     * @param  array<string, mixed>  $checkpoint
     */
    public function causeOf(array $checkpoint): string
    {
        $doc = $checkpoint['doc'];
        foreach ($doc['parts'] as $part) {
            if ($part['id'] === 'R1' && $part['value'] > 10000) {
                return 'big';
            }
        }
        foreach ($doc['wires'] as $wire) {
            if ($wire['id'] === 'w2') {
                return 'reversed';
            }
        }

        return 'open';
    }

    /**
     * @return array<string, mixed>
     */
    private function faultyDoc(string $variant): array
    {
        $reversed = $variant === 'reversed';
        $led = ['id' => 'D1', 'type' => 'led', 'x' => 60, 'y' => -80, 'rot' => $reversed ? 180 : 0, 'color' => 'red'];
        $wires = [self::wire('w1', 'B1.+', 'R1.a')];
        if ($variant !== 'open') {
            $wires[] = $reversed ? self::wire('w2', 'R1.b', 'D1.k') : self::wire('w2', 'R1.b', 'D1.a');
        }
        $wires[] = $reversed ? self::wire('w3', 'D1.a', 'J1.j') : self::wire('w3', 'D1.k', 'J1.j');
        $wires[] = self::wire('w4', 'J1.j', 'B1.-');

        return [
            'parts' => [
                ['id' => 'B1', 'type' => 'battery', 'x' => -160, 'y' => 0, 'rot' => 90, 'value' => 9],
                ['id' => 'R1', 'type' => 'resistor', 'x' => -60, 'y' => -80, 'rot' => 0, 'value' => $variant === 'big' ? 47000 : 330],
                $led,
                ['id' => 'J1', 'type' => 'junction', 'x' => 160, 'y' => 40, 'rot' => 0],
            ],
            'wires' => $wires,
        ];
    }

    /**
     * @return array{id: string, from: array{part: string, pin: string}, to: array{part: string, pin: string}}
     */
    private static function wire(string $id, string $from, string $to): array
    {
        [$fp, $fpin] = explode('.', $from);
        [$tp, $tpin] = explode('.', $to);

        return ['id' => $id, 'from' => ['part' => $fp, 'pin' => $fpin], 'to' => ['part' => $tp, 'pin' => $tpin]];
    }

    /* ------------------------------------------------------------------ */
    /* Grading                                                             */
    /* ------------------------------------------------------------------ */

    public function grade(array $checkpoints, array $answers): ?array
    {
        $results = [];

        foreach ($checkpoints as $checkpoint) {
            $answer = $answers[$checkpoint['id']] ?? null;

            if ($answer === null) {
                $results[] = ['id' => $checkpoint['id'], 'correct' => false];

                continue;
            }
            if (! is_array($answer)) {
                return null;
            }

            $correct = $this->check($checkpoint, $answer);
            if ($correct === null) {
                return null;
            }

            $results[] = ['id' => $checkpoint['id'], 'correct' => $correct];
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $checkpoint
     * @param  array<string, mixed>  $answer
     */
    private function check(array $checkpoint, array $answer): ?bool
    {
        switch ($checkpoint['type']) {
            case 'ohms_law':
                $amps = $this->number($answer['amps'] ?? null);

                return $amps === null ? null : ColorCode::near($amps, $checkpoint['volts'] / $checkpoint['ohms'], self::CALC_TOLERANCE);

            case 'build_led':
                $doc = $this->document($answer);

                return $doc === null ? null : $this->buildLed($checkpoint, $doc);

            case 'measure_voltage':
                $doc = $this->document($answer);
                $volts = $this->number($answer['volts'] ?? null);

                return $doc === null || $volts === null ? null : $this->measureVoltage($checkpoint, $doc, $volts);

            case 'measure_current':
                $doc = $this->document($answer);
                $amps = $this->number($answer['amps'] ?? null);

                return $doc === null || $amps === null ? null : $this->measureCurrent($checkpoint, $doc, $amps);

            case 'troubleshoot':
                $doc = $this->document($answer);
                $cause = $answer['cause'] ?? null;
                if ($doc === null || ! is_string($cause) || ! in_array($cause, array_column($checkpoint['options'], 'value'), true)) {
                    return null;
                }

                return $cause === $this->causeOf($checkpoint) && $this->fixed($checkpoint, $doc);

            case 'parallel':
                $doc = $this->document($answer);
                $ohms = $this->number($answer['ohms'] ?? null);

                return $doc === null || $ohms === null ? null : $this->parallel($checkpoint, $doc, $ohms);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $answer
     * @return array<string, mixed>|null
     */
    private function document(array $answer): ?array
    {
        $parsed = CircuitDocument::parse($answer['doc'] ?? null);

        return $parsed['doc'] ?? null;
    }

    private function number(mixed $value): ?float
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value) ? (float) $value : null;
    }

    /**
     * @param  array<string, mixed>  $doc
     * @return array<string, mixed>|null
     */
    private function part(array $doc, string $id): ?array
    {
        foreach ($doc['parts'] as $part) {
            if ($part['id'] === $id) {
                return $part;
            }
        }

        return null;
    }

    /**
     * The part exists with the type and value the challenge issued.
     *
     * @param  array<string, mixed>  $doc
     */
    private function unchanged(array $doc, string $id, string $type, ?float $value): bool
    {
        $part = $this->part($doc, $id);

        return $part !== null && $part['type'] === $type && ($value === null || abs(($part['value'] ?? 0.0) - $value) < 1e-9);
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function buildLed(array $checkpoint, array $doc): bool
    {
        $supply = $this->part($doc, 'V1');
        $led = $this->part($doc, 'D1');
        if ($supply === null || $supply['type'] !== 'supply' || abs($supply['value'] - $checkpoint['volts']) > 1e-9) {
            return false;
        }
        if ($led === null || $led['type'] !== 'led' || $led['color'] !== $checkpoint['color']) {
            return false;
        }

        $hasResistor = false;
        foreach ($doc['parts'] as $part) {
            if (in_array($part['type'], ['battery', 'supply'], true) && $part['id'] !== 'V1') {
                return false;
            }
            $hasResistor = $hasResistor || $part['type'] === 'resistor';
        }
        if (! $hasResistor) {
            return false;
        }

        $result = Solver::solve($doc);
        $d1 = $result['elements']['D1'];

        return $d1['on'] === true && $d1['i'] >= $checkpoint['min'] && $d1['i'] <= $checkpoint['max'] && $result['flags'] === [];
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function measureVoltage(array $checkpoint, array $doc, float $volts): bool
    {
        if (! $this->unchanged($doc, 'B1', 'battery', null) || ! $this->unchanged($doc, 'R1', 'resistor', (float) $checkpoint['r1']) || ! $this->unchanged($doc, 'R2', 'resistor', (float) $checkpoint['r2'])) {
            return false;
        }
        $meter = $this->part($doc, 'M1');
        if ($meter === null || $meter['type'] !== 'meter' || $meter['mode'] !== 'V') {
            return false;
        }

        $expected = $this->loop($checkpoint)['elements'][$checkpoint['target']]['v'];
        $reading = Solver::solve($doc)['meters']['M1']['value'] ?? null;

        return $reading !== null
            && ColorCode::near($reading, $expected, self::READING_TOLERANCE)
            && ColorCode::near($volts, $expected, self::READING_TOLERANCE);
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function measureCurrent(array $checkpoint, array $doc, float $amps): bool
    {
        if (! $this->unchanged($doc, 'B1', 'battery', null) || ! $this->unchanged($doc, 'R1', 'resistor', (float) $checkpoint['r1']) || ! $this->unchanged($doc, 'R2', 'resistor', (float) $checkpoint['r2'])) {
            return false;
        }
        $meter = $this->part($doc, 'M1');
        if ($meter === null || $meter['type'] !== 'meter' || $meter['mode'] !== 'A') {
            return false;
        }

        $expected = $this->loop($checkpoint)['elements']['R1']['i'];
        $reading = Solver::solve($doc)['meters']['M1']['value'] ?? null;

        return $reading !== null
            && ColorCode::near($reading, $expected, self::READING_TOLERANCE)
            && ColorCode::near($amps, $expected, self::READING_TOLERANCE);
    }

    /**
     * The intended circuit for the two measure challenges: battery and two resistors in series.
     *
     * @param  array<string, mixed>  $checkpoint
     * @return array<string, mixed>
     */
    private function loop(array $checkpoint): array
    {
        return Solver::solve([
            'parts' => [
                ['id' => 'B1', 'type' => 'battery', 'value' => 9.0],
                ['id' => 'R1', 'type' => 'resistor', 'value' => (float) $checkpoint['r1']],
                ['id' => 'R2', 'type' => 'resistor', 'value' => (float) $checkpoint['r2']],
            ],
            'wires' => [
                self::wire('w1', 'B1.+', 'R1.a'),
                self::wire('w2', 'R1.b', 'R2.a'),
                self::wire('w3', 'R2.b', 'B1.-'),
            ],
        ]);
    }

    /**
     * The repaired LED circuit works, within its limits.
     *
     * @param  array<string, mixed>  $doc
     */
    private function fixed(array $checkpoint, array $doc): bool
    {
        if (! $this->unchanged($doc, 'B1', 'battery', null) || ! $this->unchanged($doc, 'R1', 'resistor', null) || $this->part($doc, 'D1') === null || $this->part($doc, 'D1')['type'] !== 'led') {
            return false;
        }

        $result = Solver::solve($doc);
        $d1 = $result['elements']['D1'];

        return $d1['on'] === true && $d1['i'] >= $checkpoint['min'] && $d1['i'] <= $checkpoint['max'] && $result['flags'] === [];
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function parallel(array $checkpoint, array $doc, float $ohms): bool
    {
        if (! $this->unchanged($doc, 'R1', 'resistor', (float) $checkpoint['r1'])) {
            return false;
        }
        $second = $this->part($doc, 'R2');
        if ($second === null || $second['type'] !== 'resistor') {
            return false;
        }
        foreach ($doc['parts'] as $part) {
            if (in_array($part['type'], ['battery', 'supply'], true)) {
                return false;
            }
        }

        $built = Solver::resistanceBetween($doc, 'R1.a', 'R1.b');

        return ColorCode::near($built, $checkpoint['target'], self::READING_TOLERANCE)
            && ColorCode::near($ohms, $checkpoint['target'], self::READING_TOLERANCE);
    }
}
