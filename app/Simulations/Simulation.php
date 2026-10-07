<?php

namespace App\Simulations;

/**
 * One interactive lab. Each simulation issues a fresh set of checkpoints per
 * visit and grades the student's raw answers itself: the score a browser
 * reports is only ever compared against this, never stored as is.
 */
interface Simulation
{
    /** Stable key stored on module_pages.simulation_key and simulation_attempts. */
    public function key(): string;

    public function title(): string;

    public function summary(): string;

    /**
     * TESDA units of competency this simulation teaches, code => title.
     *
     * @return array<string, string>
     */
    public function units(): array;

    /** Vite entry the Blade island loads. */
    public function entry(): string;

    /** Vite stylesheet the Blade island loads. Labs may share one. */
    public function css(): string;

    /** Folder under public/ for this lab's own assets (models, textures, wasm). No trailing slash. */
    public function assetPath(): string;

    /**
     * True when the browser can work out the score itself (instant feedback) and
     * sends it along: the server then refuses a request whose score disagrees with
     * its own. False when only the server can grade (open-ended answers such as a
     * circuit the student built): the server's score is the only one.
     */
    public function reportsLocalScore(): bool;

    /**
     * A new set of checkpoint parameters. Contains no answers.
     *
     * @return list<array<string, mixed>>
     */
    public function checkpoints(): array;

    /**
     * Grade raw answers against the checkpoints issued earlier.
     *
     * @param  list<array<string, mixed>>  $checkpoints
     * @param  array<int|string, mixed>  $answers
     * @return list<array{id: string, correct: bool}>|null null when the answers are malformed
     */
    public function grade(array $checkpoints, array $answers): ?array;
}
