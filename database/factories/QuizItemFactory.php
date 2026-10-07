<?php

namespace Database\Factories;

use App\Models\Quiz;
use App\Models\QuizItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuizItem>
 */
class QuizItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'quiz_id' => Quiz::factory(),
            'number' => fake()->unique()->numberBetween(1, 10),
            'stem' => fake()->sentence().'?',
            'choices' => [fake()->word(), fake()->word(), fake()->word(), fake()->word()],
            'correct_index' => fake()->numberBetween(0, 3),
            'rationale' => fake()->sentence(),
        ];
    }
}
