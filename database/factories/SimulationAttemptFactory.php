<?php

namespace Database\Factories;

use App\Models\SimulationAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SimulationAttempt>
 */
class SimulationAttemptFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'simulation_key' => 'resistor-lab',
            'module_page_id' => null,
            'score' => fake()->numberBetween(1, 4),
            'max_score' => 4,
            'payload' => ['checkpoints' => []],
            'completed_at' => fake()->dateTimeBetween('-2 weeks', 'now'),
        ];
    }
}
