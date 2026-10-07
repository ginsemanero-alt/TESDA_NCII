<?php

namespace Database\Factories;

use App\Models\Competency;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Module>
 */
class ModuleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'competency_id' => Competency::factory(),
            'number' => fake()->unique()->numberBetween(1, 6),
            'title' => fake()->sentence(3),
            'page_count' => fake()->numberBetween(8, 16),
        ];
    }
}
