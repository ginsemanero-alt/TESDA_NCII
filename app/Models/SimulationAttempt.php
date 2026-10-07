<?php

namespace App\Models;

use App\Simulations\Simulation;
use App\Simulations\SimulationRegistry;
use Database\Factories\SimulationAttemptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SimulationAttempt extends Model
{
    /** @use HasFactory<SimulationAttemptFactory> */
    use HasFactory;

    /** Share of the checkpoints a student must get right to pass. */
    public const PASS_PERCENT = 75;

    protected $fillable = [
        'user_id',
        'simulation_key',
        'module_page_id',
        'score',
        'max_score',
        'payload',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<ModulePage, $this>
     */
    public function modulePage(): BelongsTo
    {
        return $this->belongsTo(ModulePage::class);
    }

    public function simulation(): ?Simulation
    {
        return SimulationRegistry::find($this->simulation_key);
    }

    public function percent(): int
    {
        return $this->max_score > 0 ? (int) round($this->score / $this->max_score * 100) : 0;
    }

    public function passed(): bool
    {
        return $this->percent() >= self::PASS_PERCENT;
    }
}
