<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_STUDENT = 'student';

    public const ROLE_INSTRUCTOR = 'instructor';

    public const ROLE_ADMIN = 'admin';

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_LOCKED = 'locked';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'password',
        'role',
        'status',
        'lrn',
        'section_id',
        'last_active_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_active_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Section, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * @return HasMany<ModuleProgress, $this>
     */
    public function moduleProgress(): HasMany
    {
        return $this->hasMany(ModuleProgress::class);
    }

    /**
     * @return HasMany<QuizScore, $this>
     */
    public function quizScores(): HasMany
    {
        return $this->hasMany(QuizScore::class);
    }

    /**
     * @return HasMany<SimulationAttempt, $this>
     */
    public function simulationAttempts(): HasMany
    {
        return $this->hasMany(SimulationAttempt::class);
    }

    /**
     * @return HasMany<JobSheetSubmission, $this>
     */
    public function jobSheetSubmissions(): HasMany
    {
        return $this->hasMany(JobSheetSubmission::class);
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function receivedMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'recipient_id');
    }

    public function isStudent(): bool
    {
        return $this->role === self::ROLE_STUDENT;
    }

    public function isInstructor(): bool
    {
        return $this->role === self::ROLE_INSTRUCTOR;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function dashboardRouteName(): string
    {
        return match ($this->role) {
            self::ROLE_INSTRUCTOR => 'instructor.dashboard',
            self::ROLE_ADMIN => 'admin.dashboard',
            default => 'student.dashboard',
        };
    }

    public function initials(): string
    {
        $name = trim(str_replace(',', '', $this->name));
        $parts = preg_split('/\s+/', $name) ?: [];
        $parts = array_values(array_filter($parts));

        if ($parts === []) {
            return Str::upper(Str::substr($this->username, 0, 2));
        }

        $first = Str::substr($parts[0], 0, 1);
        $last = count($parts) > 1 ? Str::substr($parts[count($parts) - 1], 0, 1) : '';

        return Str::upper($first.$last);
    }

    public function firstName(): string
    {
        $given = Str::contains($this->name, ',')
            ? Str::of($this->name)->after(',')->trim()->toString()
            : Str::of($this->name)->trim()->before(' ')->toString();

        $words = array_filter(
            preg_split('/\s+/', $given) ?: [],
            fn (string $word): bool => ! preg_match('/^[A-Z]\.?$/', $word),
        );

        return implode(' ', $words) ?: $given;
    }
}
