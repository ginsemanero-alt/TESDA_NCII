<?php

namespace App\Models;

use Database\Factories\CompetencyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Competency extends Model
{
    /** @use HasFactory<CompetencyFactory> */
    use HasFactory;

    protected $fillable = [
        'code',
        'title',
        'short_title',
        'summary',
        'sort',
    ];

    /**
     * @return HasMany<Module, $this>
     */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('number');
    }

    /**
     * @return HasMany<QuizScore, $this>
     */
    public function quizScores(): HasMany
    {
        return $this->hasMany(QuizScore::class);
    }

    /**
     * @return HasMany<Quiz, $this>
     */
    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }
}
