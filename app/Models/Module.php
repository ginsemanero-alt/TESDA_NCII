<?php

namespace App\Models;

use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    /** @use HasFactory<ModuleFactory> */
    use HasFactory;

    protected $fillable = [
        'competency_id',
        'number',
        'title',
        'page_count',
    ];

    /**
     * @return BelongsTo<Competency, $this>
     */
    public function competency(): BelongsTo
    {
        return $this->belongsTo(Competency::class);
    }

    /**
     * @return HasMany<ModuleProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(ModuleProgress::class);
    }

    /**
     * @return HasMany<ModulePage, $this>
     */
    public function pages(): HasMany
    {
        return $this->hasMany(ModulePage::class)->orderBy('number');
    }
}
