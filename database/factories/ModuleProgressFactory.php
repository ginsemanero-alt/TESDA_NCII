<?php

namespace Database\Factories;

use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModuleProgress>
 */
class ModuleProgressFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'module_id' => Module::factory(),
            'status' => ModuleProgress::STATUS_NOT_STARTED,
            'current_page' => 0,
        ];
    }

    public function inProgress(int $page = 4): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ModuleProgress::STATUS_IN_PROGRESS,
            'current_page' => $page,
        ]);
    }

    public function done(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ModuleProgress::STATUS_DONE,
        ]);
    }
}
