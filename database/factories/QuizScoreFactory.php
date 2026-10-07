<?php

namespace Database\Factories;

use App\Models\QuizScore;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuizScore>
 */
class QuizScoreFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $score = fake()->numberBetween(4, 10);

        return [
            'user_id' => User::factory(),
            'competency_id' => null,
            'title' => 'Self-check '.fake()->numberBetween(1, 3).'.'.fake()->numberBetween(1, 3).', '.fake()->words(3, true),
            'score' => $score,
            'total' => 10,
            'status' => $score >= 8 ? QuizScore::STATUS_PASSED : QuizScore::STATUS_RETAKE,
            'taken_on' => fake()->dateTimeBetween('-1 month', 'now'),
        ];
    }
}
