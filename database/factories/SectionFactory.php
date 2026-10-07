<?php

namespace Database\Factories;

use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Section>
 */
class SectionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $grade = fake()->randomElement([11, 12]);

        return [
            'name' => "Grade {$grade} ".fake()->unique()->randomElement([
                'Volt', 'Ohm', 'Ampere', 'Watt', 'Henry', 'Tesla', 'Farad', 'Joule', 'Hertz', 'Coulomb', 'Weber', 'Siemens',
            ]),
            'grade_level' => $grade,
        ];
    }
}
