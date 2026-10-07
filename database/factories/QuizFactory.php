<?php

namespace Database\Factories;

use App\Models\Competency;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quiz>
 */
class QuizFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'competency_id' => Competency::factory(),
            'author_id' => User::factory()->instructor(),
            'title' => 'Self-check '.fake()->numberBetween(1, 3).'.'.fake()->numberBetween(1, 3).', '.fake()->words(3, true),
            'reference' => 'CBLM '.fake()->bothify('?#.#'),
            'pass_mark' => 75,
            'max_attempts' => 3,
            'is_published' => true,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => ['is_published' => false]);
    }
}
