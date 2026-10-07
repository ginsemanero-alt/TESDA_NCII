<?php

namespace App\Models;

use Database\Factories\QuizItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizItem extends Model
{
    /** @use HasFactory<QuizItemFactory> */
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'number',
        'stem',
        'choices',
        'correct_index',
        'rationale',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'choices' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Quiz, $this>
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }
}
