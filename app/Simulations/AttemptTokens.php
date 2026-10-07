<?php

namespace App\Simulations;

use App\Models\ModulePage;
use App\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Str;

/**
 * Keeps the checkpoints a student was given in their session, under a random
 * token. The attempt endpoint grades against what was issued here, so a
 * student cannot invent easier questions or replay a token from someone
 * else's browser.
 */
final class AttemptTokens
{
    private const SESSION_KEY = 'simulations.tokens';

    /** Tokens older than this are refused. A lesson is one sitting. */
    private const LIFETIME_MINUTES = 240;

    /** Open tabs a student may have at once before the oldest token is dropped. */
    private const MAX_OPEN = 8;

    public function __construct(private Session $session) {}

    /**
     * @return array{token: string, checkpoints: list<array<string, mixed>>}
     */
    public function issue(User $user, Simulation $simulation, ?ModulePage $page = null): array
    {
        $token = Str::random(40);
        $checkpoints = $simulation->checkpoints();

        $open = collect($this->session->get(self::SESSION_KEY, []))
            ->filter(fn (array $entry): bool => $this->fresh($entry))
            ->sortByDesc('issued_at')
            ->take(self::MAX_OPEN - 1)
            ->all();

        $open[$token] = [
            'simulation_key' => $simulation->key(),
            'user_id' => $user->id,
            'module_page_id' => $page?->id,
            'checkpoints' => $checkpoints,
            'issued_at' => now()->getTimestamp(),
        ];

        $this->session->put(self::SESSION_KEY, $open);

        return ['token' => $token, 'checkpoints' => $checkpoints];
    }

    /**
     * The entry for a token, if it is still valid for this student.
     *
     * @return array{simulation_key: string, user_id: int, module_page_id: int|null, checkpoints: list<array<string, mixed>>, issued_at: int}|null
     */
    public function find(User $user, string $token): ?array
    {
        $entry = $this->session->get(self::SESSION_KEY, [])[$token] ?? null;

        if ($entry === null || $entry['user_id'] !== $user->id || ! $this->fresh($entry)) {
            return null;
        }

        return $entry;
    }

    /** A token is single use: grading it consumes it. */
    public function forget(string $token): void
    {
        $open = $this->session->get(self::SESSION_KEY, []);
        unset($open[$token]);
        $this->session->put(self::SESSION_KEY, $open);
    }

    /**
     * @param  array{issued_at: int}  $entry
     */
    private function fresh(array $entry): bool
    {
        return $entry['issued_at'] >= now()->subMinutes(self::LIFETIME_MINUTES)->getTimestamp();
    }
}
