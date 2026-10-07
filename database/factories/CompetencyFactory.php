<?php

namespace Database\Factories;

use App\Models\Competency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Competency>
 */
class CompetencyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->randomElement([
            'Assemble electronic products',
            'Prepare and interpret technical drawings',
            'Use hand tools and test instruments',
            'Terminate and connect wiring and circuits',
        ]);

        return [
            'code' => 'ELC'.fake()->unique()->numerify('######'),
            'title' => $title,
            'short_title' => $title,
            'summary' => fake()->sentence(),
            'sort' => fake()->numberBetween(1, 9),
        ];
    }
}
