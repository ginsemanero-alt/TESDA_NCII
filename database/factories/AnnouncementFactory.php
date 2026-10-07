<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'section_id' => Section::factory(),
            'author_id' => User::factory()->instructor(),
            'body' => fake()->sentence(12),
        ];
    }
}
