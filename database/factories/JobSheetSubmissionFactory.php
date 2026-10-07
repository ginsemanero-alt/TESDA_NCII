<?php

namespace Database\Factories;

use App\Models\JobSheetSubmission;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSheetSubmission>
 */
class JobSheetSubmissionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'section_id' => Section::factory(),
            'reviewed_by' => null,
            'label' => 'Job sheet '.fake()->numberBetween(1, 3).'.'.fake()->numberBetween(1, 3).', '.fake()->words(5, true),
            'status' => JobSheetSubmission::STATUS_PENDING,
            'submitted_at' => fake()->dateTimeBetween('-6 days', 'now'),
            'reviewed_at' => null,
        ];
    }

    public function achieved(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => JobSheetSubmission::STATUS_ACHIEVED,
            'reviewed_at' => now(),
        ]);
    }
}
