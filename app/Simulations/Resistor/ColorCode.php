<?php

namespace App\Simulations\Resistor;

/**
 * Server-side twin of resources/js/simulations/resistor/lib/resistor.ts.
 *
 * The IEC 60062 four-band colour code and Ohm's law. The lab computes feedback
 * in the browser with the TypeScript version; the server recomputes every
 * score with this one. tests/fixtures/resistor-vectors.json is checked against
 * both (PHPUnit and `npm run check:resistor`) so they cannot drift apart.
 */
final class ColorCode
{
    /**
     * digit, multiplier and tolerance (percent) per colour; null when a colour
     * cannot encode that role.
     *
     * @var array<string, array{digit: int|null, multiplier: float|null, tolerance: float|null}>
     */
    public const BANDS = [
        'black' => ['digit' => 0, 'multiplier' => 1.0, 'tolerance' => null],
        'brown' => ['digit' => 1, 'multiplier' => 10.0, 'tolerance' => 1.0],
        'red' => ['digit' => 2, 'multiplier' => 100.0, 'tolerance' => 2.0],
        'orange' => ['digit' => 3, 'multiplier' => 1_000.0, 'tolerance' => null],
        'yellow' => ['digit' => 4, 'multiplier' => 10_000.0, 'tolerance' => null],
        'green' => ['digit' => 5, 'multiplier' => 100_000.0, 'tolerance' => 0.5],
        'blue' => ['digit' => 6, 'multiplier' => 1_000_000.0, 'tolerance' => 0.25],
        'violet' => ['digit' => 7, 'multiplier' => 10_000_000.0, 'tolerance' => 0.1],
        'grey' => ['digit' => 8, 'multiplier' => 100_000_000.0, 'tolerance' => 0.05],
        'white' => ['digit' => 9, 'multiplier' => 1_000_000_000.0, 'tolerance' => null],
        'gold' => ['digit' => null, 'multiplier' => 0.1, 'tolerance' => 5.0],
        'silver' => ['digit' => null, 'multiplier' => 0.01, 'tolerance' => 10.0],
    ];

    /** Band roles in reading order, as in BAND_ROLES on the client. */
    public const ROLES = ['first digit', 'second digit', 'multiplier', 'tolerance'];

    /**
     * Colours a band may take at a position, mirroring ALLOWED_COLORS.
     *
     * @return list<string>
     */
    public static function allowed(int $position): array
    {
        return array_keys(array_filter(self::BANDS, fn (array $spec): bool => match ($position) {
            0 => $spec['digit'] !== null && $spec['digit'] !== 0,
            1 => $spec['digit'] !== null,
            2 => $spec['multiplier'] !== null,
            3 => $spec['tolerance'] !== null,
            default => false,
        }));
    }

    /**
     * @param  mixed  $bands
     */
    public static function isValidBandSet($bands): bool
    {
        if (! is_array($bands) || ! array_is_list($bands) || count($bands) !== 4) {
            return false;
        }

        foreach ($bands as $position => $color) {
            if (! is_string($color) || ! in_array($color, self::allowed($position), true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string>  $bands
     * @return array{ohms: float, tolerance: float|null, min: float, max: float}
     */
    public static function read(array $bands): array
    {
        $d1 = self::BANDS[$bands[0]]['digit'] ?? 0;
        $d2 = self::BANDS[$bands[1]]['digit'] ?? 0;
        $multiplier = self::BANDS[$bands[2]]['multiplier'] ?? 1.0;
        $tolerance = self::BANDS[$bands[3]]['tolerance'];

        $ohms = ($d1 * 10 + $d2) * $multiplier;
        $spread = $tolerance === null ? 0.0 : $ohms * $tolerance / 100;

        return ['ohms' => $ohms, 'tolerance' => $tolerance, 'min' => $ohms - $spread, 'max' => $ohms + $spread];
    }

    /** I = V / R, in amperes. */
    public static function current(float $volts, float $ohms): float
    {
        return $ohms == 0.0 ? INF : $volts / $ohms;
    }

    /** P = I² × R, in watts. */
    public static function power(float $amps, float $ohms): float
    {
        return $amps * $amps * $ohms;
    }

    /** True when two values agree within a relative tolerance. */
    public static function near(float $actual, float $expected, float $relative): bool
    {
        if ($expected == 0.0) {
            return abs($actual) <= $relative;
        }

        return abs($actual - $expected) <= abs($expected) * $relative;
    }
}
