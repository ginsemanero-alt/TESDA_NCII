<?php

namespace App\Simulations\Resistor;

use App\Simulations\Simulation;

/**
 * The 3D resistor lab. Five checkpoints per visit, all generated here and
 * graded here with ColorCode; the browser computes the same answers with
 * lib/resistor.ts for instant feedback.
 *
 * Checkpoint → TESDA EPAS NC II (TR p.1 codes):
 *  - read       ELC724205 2.4.4  identify a resistor's value from its bands
 *  - bands      ELC724205 2.4.4  choose the bands for a required value
 *  - role       ELC724205 2.4.4  know which band carries which meaning
 *  - current    ELC311201 PC 2.3 / ELC724205 2.4.9  Ohm's law with SI prefixes
 *  - tolerance  ELC724205 2.4.6, 2.4.7, LO 7.3–7.4  judge a DMM reading against tolerance
 */
final class ResistorLab implements Simulation
{
    public const KEY = 'resistor-lab';

    /** E12 preferred values, the two significant figures printed on real parts. */
    private const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

    private const DIGIT_COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];

    /** Relative error accepted on typed numbers: enough for 3 significant figures. */
    public const NUMERIC_TOLERANCE = 0.02;

    public function key(): string
    {
        return self::KEY;
    }

    public function title(): string
    {
        return 'Resistor lab';
    }

    public function summary(): string
    {
        return 'Read the colour code, check a part with the multimeter, and work out current with Ohm\'s law on a real 1/4 W carbon-film resistor.';
    }

    public function units(): array
    {
        return [
            'ELC724205' => 'Test electronic components',
            'ELC311201' => 'Perform mensuration and calculation',
        ];
    }

    public function entry(): string
    {
        return 'resources/js/simulations/resistor/index.tsx';
    }

    public function css(): string
    {
        return 'resources/css/simulations/labs.css';
    }

    public function assetPath(): string
    {
        return 'simulations/resistor';
    }

    public function reportsLocalScore(): bool
    {
        return true;
    }

    public function checkpoints(): array
    {
        $tolerances = ['gold', 'silver', 'brown', 'red'];

        $toleranceBands = $this->randomBands(['gold', 'silver']);
        $toleranceValue = ColorCode::read($toleranceBands);
        $inside = random_int(0, 1) === 1;
        $spread = $toleranceValue['tolerance'] / 100;
        $offset = $inside
            ? $spread * random_int(10, 80) / 100
            : $spread * random_int(130, 200) / 100;
        $measured = $this->significant($toleranceValue['ohms'] * (1 + (random_int(0, 1) === 1 ? $offset : -$offset)));

        $target = $this->randomBands([$tolerances[array_rand($tolerances)]]);
        $targetValue = ColorCode::read($target);

        return [
            ['id' => 'c1', 'type' => 'read', 'unit' => 'ELC724205', 'bands' => $this->randomBands($tolerances)],
            ['id' => 'c2', 'type' => 'bands', 'unit' => 'ELC724205', 'ohms' => $targetValue['ohms'], 'tolerance' => $targetValue['tolerance']],
            ['id' => 'c3', 'type' => 'role', 'unit' => 'ELC724205', 'bands' => $this->randomBands($tolerances), 'role' => random_int(0, 3)],
            ['id' => 'c4', 'type' => 'current', 'unit' => 'ELC311201', 'volts' => [1.5, 3, 5, 9, 12][random_int(0, 4)], 'ohms' => self::E12[array_rand(self::E12)] * 10 ** random_int(1, 3)],
            ['id' => 'c5', 'type' => 'tolerance', 'unit' => 'ELC724205', 'bands' => $toleranceBands, 'measured' => $measured],
        ];
    }

    public function grade(array $checkpoints, array $answers): ?array
    {
        $results = [];

        foreach ($checkpoints as $checkpoint) {
            $answer = $answers[$checkpoint['id']] ?? null;

            if ($answer !== null && ! is_array($answer)) {
                return null;
            }

            $correct = $answer === null ? false : $this->check($checkpoint, $answer);

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
            case 'read':
                if (! $this->isNumber($answer['ohms'] ?? null)) {
                    return null;
                }

                return ColorCode::near((float) $answer['ohms'], ColorCode::read($checkpoint['bands'])['ohms'], self::NUMERIC_TOLERANCE);

            case 'bands':
                if (! ColorCode::isValidBandSet($answer['bands'] ?? null)) {
                    return null;
                }
                $value = ColorCode::read($answer['bands']);

                return ColorCode::near($value['ohms'], (float) $checkpoint['ohms'], 1e-9)
                    && $value['tolerance'] !== null
                    && ColorCode::near($value['tolerance'], (float) $checkpoint['tolerance'], 1e-9);

            case 'role':
                $band = $answer['band'] ?? null;
                if (! is_int($band) || $band < 0 || $band > 3) {
                    return null;
                }

                return $band === $checkpoint['role'];

            case 'current':
                if (! $this->isNumber($answer['amps'] ?? null)) {
                    return null;
                }

                return ColorCode::near(
                    (float) $answer['amps'],
                    ColorCode::current((float) $checkpoint['volts'], (float) $checkpoint['ohms']),
                    self::NUMERIC_TOLERANCE,
                );

            case 'tolerance':
                $within = $answer['within'] ?? null;
                if (! is_bool($within)) {
                    return null;
                }
                $value = ColorCode::read($checkpoint['bands']);
                $measured = (float) $checkpoint['measured'];

                return $within === ($measured >= $value['min'] && $measured <= $value['max']);
        }

        return null;
    }

    /**
     * A plausible E12 part, 10 Ω to 820 kΩ.
     *
     * @param  list<string>  $toleranceColors
     * @return list<string>
     */
    private function randomBands(array $toleranceColors): array
    {
        $significant = self::E12[array_rand(self::E12)];

        return [
            self::DIGIT_COLORS[intdiv($significant, 10)],
            self::DIGIT_COLORS[$significant % 10],
            self::DIGIT_COLORS[random_int(0, 4)],
            $toleranceColors[array_rand($toleranceColors)],
        ];
    }

    /** Rounds to three significant figures, as a 3½-digit meter would show. */
    private function significant(float $value): float
    {
        return (float) sprintf('%.3g', $value);
    }

    private function isNumber(mixed $value): bool
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value) && $value >= 0;
    }
}
