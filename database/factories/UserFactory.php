<?php

namespace Database\Factories;

use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $last = fake()->lastName();
        $first = fake()->firstName();

        return [
            'name' => "{$last}, {$first}",
            'username' => Str::lower($first.'.'.Str::substr($last, 0, 1)).fake()->unique()->numberBetween(1, 999),
            'password' => static::$password ??= Hash::make('password'),
            'role' => User::ROLE_STUDENT,
            'status' => User::STATUS_ACTIVE,
            'lrn' => (string) fake()->numerify('############'),
            'section_id' => null,
            'last_active_at' => fake()->dateTimeBetween('-2 weeks', 'now'),
            'remember_token' => Str::random(10),
        ];
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => User::ROLE_STUDENT,
            'section_id' => Section::factory(),
        ]);
    }

    public function instructor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => User::ROLE_INSTRUCTOR,
            'lrn' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => User::ROLE_ADMIN,
            'lrn' => null,
            'section_id' => null,
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => User::STATUS_PENDING,
        ]);
    }

    public function locked(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => User::STATUS_LOCKED,
        ]);
    }
}
