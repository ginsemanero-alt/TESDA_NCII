<?php

namespace Database\Factories;

use App\Models\Module;
use App\Models\ModulePage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModulePage>
 */
class ModulePageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'number' => fake()->unique()->numberBetween(1, 13),
            'heading' => fake()->sentence(4),
            'body' => fake()->paragraphs(3, true),
        ];
    }

    public function simulation(string $key = 'resistor-lab'): static
    {
        return $this->state(fn (): array => [
            'type' => ModulePage::TYPE_SIMULATION,
            'simulation_key' => $key,
        ]);
    }
}
