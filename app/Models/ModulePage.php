<?php

namespace App\Models;

use Database\Factories\ModulePageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModulePage extends Model
{
    /** @use HasFactory<ModulePageFactory> */
    use HasFactory;

    public const TYPE_TEXT = 'text';

    public const TYPE_SIMULATION = 'simulation';

    protected $fillable = [
        'module_id',
        'number',
        'type',
        'simulation_key',
        'heading',
        'body',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => self::TYPE_TEXT,
    ];

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function isSimulation(): bool
    {
        return $this->type === self::TYPE_SIMULATION && $this->simulation_key !== null;
    }
}
