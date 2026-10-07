<?php

namespace Database\Factories;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category' => fake()->randomElement([
                ActivityLog::CATEGORY_SIGN_IN,
                ActivityLog::CATEGORY_CONTENT,
                ActivityLog::CATEGORY_ACCOUNT,
                ActivityLog::CATEGORY_SYSTEM,
            ]),
            'description' => fake()->sentence(6),
            'actor' => fake()->name(),
            'device' => fake()->randomElement(['Laptop, office', 'Android phone', 'School server', 'Laptop, lab 1']),
            'occurred_at' => fake()->dateTimeBetween('-1 day', 'now'),
        ];
    }
}
