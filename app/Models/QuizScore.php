<?php

namespace App\Models;

use Database\Factories\QuizScoreFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizScore extends Model
{
    /** @use HasFactory<QuizScoreFactory> */
    use HasFactory;

    public const STATUS_PASSED = 'passed';

    public const STATUS_RETAKE = 'retake';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'competency_id',
        'quiz_id',
        'title',
        'score',
        'total',
        'answers',
        'attempt_number',
        'status',
        'taken_on',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'taken_on' => 'date',
            'answers' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Quiz, $this>
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Competency, $this>
     */
    public function competency(): BelongsTo
    {
        return $this->belongsTo(Competency::class);
    }

    public function percentage(): int
    {
        return $this->total > 0 ? (int) round($this->score / $this->total * 100) : 0;
    }
}
