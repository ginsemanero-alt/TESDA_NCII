<?php

namespace App\Simulations;

use App\Simulations\Circuit\CircuitSandbox;
use App\Simulations\Resistor\ResistorLab;

/**
 * The fixed list of simulations. Instructors pick from this list when they
 * make a lesson page interactive; the attempt endpoint only accepts these keys.
 * To add a simulation, implement Simulation and register its class here
 * (see docs/SIMULATIONS.md).
 */
final class SimulationRegistry
{
    /** @var list<class-string<Simulation>> */
    private const CLASSES = [
        ResistorLab::class,
        CircuitSandbox::class,
    ];

    /**
     * @return array<string, Simulation>
     */
    public static function all(): array
    {
        $simulations = [];
        foreach (self::CLASSES as $class) {
            $simulation = new $class;
            $simulations[$simulation->key()] = $simulation;
        }

        return $simulations;
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function find(?string $key): ?Simulation
    {
        return $key === null ? null : (self::all()[$key] ?? null);
    }
}
