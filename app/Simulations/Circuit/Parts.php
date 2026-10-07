<?php

namespace App\Simulations\Circuit;

/**
 * Electrical definitions of the workbench parts. Mirrors
 * resources/js/simulations/circuit/lib/parts.ts; tests/fixtures/circuit-vectors.json
 * is checked against both, so a change here must be made there too.
 */
final class Parts
{
    /** Pin names per part type, in drawing order. */
    public const PINS = [
        'battery' => ['+', '-'],
        'supply' => ['+', '-'],
        'resistor' => ['a', 'b'],
        'led' => ['a', 'k'],
        'switch' => ['a', 'b'],
        'junction' => ['j'],
        'meter' => ['com', 'v'],
    ];

    public const MAX_PARTS = 40;

    public const MAX_WIRES = 100;

    public const RESISTOR_MIN = 1.0;

    public const RESISTOR_MAX = 10_000_000.0;

    public const RESISTOR_WATTS = 0.25;

    public const SUPPLY_MIN = 0.0;

    public const SUPPLY_MAX = 15.0;

    public const BATTERY_VOLTS = 9.0;

    /** Internal resistance (ohms) and the current beyond which a source is overloaded (amperes). */
    public const SOURCE = [
        'battery' => ['r' => 1.5, 'max' => 0.5],
        'supply' => ['r' => 0.2, 'max' => 1.0],
    ];

    public const LED = [
        'red' => ['vf' => 1.9, 'max' => 0.03],
        'green' => ['vf' => 2.1, 'max' => 0.03],
    ];

    /** Dynamic resistance of a conducting LED, ohms. */
    public const LED_RS = 5.0;

    /** Reverse voltage that damages an LED, volts. */
    public const LED_REVERSE_VOLTS = 5.0;

    public const SWITCH_CLOSED_OHMS = 0.01;

    public const VOLTMETER_OHMS = 10_000_000.0;

    public const AMMETER_OHMS = 0.01;

    public const FUSE_AMPS = 0.4;

    public const LIVE_VOLTS = 0.05;

    public const BEEP_OHMS = 50.0;

    public const TEST_AMPS = 1e-3;

    /** Tiny conductance from every net to its island's reference (siemens). */
    public const GMIN = 1e-12;

    public const METER_MODES = ['V', 'A', 'ohm', 'cont'];

    public const LED_COLORS = ['red', 'green'];

    /** Preferred resistor values, E12, 10 ohm to 1 megohm. Mirrors RESISTOR_VALUES. */
    public static function resistorValues(): array
    {
        $e12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
        $values = [];
        for ($power = 0; $power <= 4; $power++) {
            foreach ($e12 as $base) {
                $values[] = (float) ($base * 10 ** $power);
            }
        }
        foreach ([100_000, 120_000, 150_000, 180_000, 220_000, 270_000, 330_000, 390_000, 470_000, 560_000, 680_000, 820_000, 1_000_000] as $v) {
            $values[] = (float) $v;
        }

        return $values;
    }
}
