<?php

namespace App\Simulations\Circuit;

/**
 * Parses and checks a circuit document that arrives from a browser. Applies
 * the same rules as parseDoc() in resources/js/simulations/circuit/lib/doc.ts,
 * so a circuit that loads in the workbench also grades here, and nothing the
 * solver is given can be malformed.
 *
 * A parsed document is a plain array: ['parts' => list of part arrays,
 * 'wires' => list of ['id', 'from' => ['part', 'pin'], 'to' => ['part', 'pin']]].
 */
final class CircuitDocument
{
    private const ID = '/^[A-Za-z][A-Za-z0-9_]{0,11}$/';

    /**
     * @return array{doc: array<string, mixed>}|array{error: string}
     */
    public static function parse(mixed $raw): array
    {
        if (! is_array($raw) || ! isset($raw['parts'], $raw['wires']) || ! is_array($raw['parts']) || ! is_array($raw['wires'])
            || ! array_is_list($raw['parts']) || ! array_is_list($raw['wires'])) {
            return ['error' => 'A circuit needs a parts list and a wires list.'];
        }
        if (count($raw['parts']) > Parts::MAX_PARTS) {
            return ['error' => 'Too many parts.'];
        }
        if (count($raw['wires']) > Parts::MAX_WIRES) {
            return ['error' => 'Too many wires.'];
        }

        $parts = [];
        $ids = [];

        foreach ($raw['parts'] as $entry) {
            if (! is_array($entry) || array_is_list($entry)) {
                return ['error' => 'A part is malformed.'];
            }
            $id = $entry['id'] ?? null;
            $type = $entry['type'] ?? null;
            if (! is_string($id) || preg_match(self::ID, $id) !== 1) {
                return ['error' => 'A part has an invalid name.'];
            }
            if (isset($ids[$id])) {
                return ['error' => "Two parts are both called {$id}."];
            }
            if (! is_string($type) || ! isset(Parts::PINS[$type])) {
                return ['error' => "{$id} is not a known part."];
            }
            $ids[$id] = true;

            $part = ['id' => $id, 'type' => $type];

            switch ($type) {
                case 'resistor':
                    $value = $entry['value'] ?? null;
                    if (! self::number($value) || $value < Parts::RESISTOR_MIN || $value > Parts::RESISTOR_MAX) {
                        return ['error' => "{$id} needs a value from 1 ohm to 10 megohm."];
                    }
                    $part['value'] = (float) $value;
                    break;
                case 'supply':
                    $value = $entry['value'] ?? null;
                    if (! self::number($value) || $value < Parts::SUPPLY_MIN || $value > Parts::SUPPLY_MAX) {
                        return ['error' => "{$id} needs a voltage from 0 to 15 V."];
                    }
                    $part['value'] = (float) $value;
                    break;
                case 'battery':
                    $part['value'] = Parts::BATTERY_VOLTS;
                    break;
                case 'led':
                    $color = $entry['color'] ?? null;
                    if (! is_string($color) || ! in_array($color, Parts::LED_COLORS, true)) {
                        return ['error' => "{$id} needs a colour, red or green."];
                    }
                    $part['color'] = $color;
                    break;
                case 'switch':
                    if (! isset($entry['closed']) || ! is_bool($entry['closed'])) {
                        return ['error' => "{$id} needs to be open or closed."];
                    }
                    $part['closed'] = $entry['closed'];
                    break;
                case 'meter':
                    $mode = $entry['mode'] ?? null;
                    if (! is_string($mode) || ! in_array($mode, Parts::METER_MODES, true)) {
                        return ['error' => "{$id} needs a mode."];
                    }
                    $part['mode'] = $mode;
                    break;
            }

            $parts[] = $part;
        }

        $byId = [];
        foreach ($parts as $part) {
            $byId[$part['id']] = $part;
        }

        $wires = [];
        $wireIds = [];

        foreach ($raw['wires'] as $entry) {
            if (! is_array($entry) || ! isset($entry['from'], $entry['to']) || ! is_array($entry['from']) || ! is_array($entry['to'])) {
                return ['error' => 'A wire is malformed.'];
            }
            $id = $entry['id'] ?? null;
            if (! is_string($id) || preg_match(self::ID, $id) !== 1 || isset($wireIds[$id])) {
                return ['error' => 'A wire has an invalid or repeated name.'];
            }
            $wireIds[$id] = true;

            foreach ([$entry['from'], $entry['to']] as $end) {
                $partId = $end['part'] ?? null;
                $pin = $end['pin'] ?? null;
                if (! is_string($partId) || ! is_string($pin) || ! isset($byId[$partId]) || ! in_array($pin, Parts::PINS[$byId[$partId]['type']], true)) {
                    return ['error' => "Wire {$id} goes to a pin that does not exist."];
                }
            }
            if ($entry['from']['part'] === $entry['to']['part'] && $entry['from']['pin'] === $entry['to']['pin']) {
                return ['error' => "Wire {$id} starts and ends on the same pin."];
            }

            $wires[] = [
                'id' => $id,
                'from' => ['part' => $entry['from']['part'], 'pin' => $entry['from']['pin']],
                'to' => ['part' => $entry['to']['part'], 'pin' => $entry['to']['pin']],
            ];
        }

        return ['doc' => ['parts' => $parts, 'wires' => $wires]];
    }

    private static function number(mixed $value): bool
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value);
    }
}
