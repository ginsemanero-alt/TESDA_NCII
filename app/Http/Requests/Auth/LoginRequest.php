<?php

namespace App\Http\Requests\Auth;

use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Failed sign-ins allowed before the throttle and the account lock kick in.
     */
    public const MAX_ATTEMPTS = 5;

    /**
     * How long the throttle holds, in seconds.
     */
    public const DECAY_SECONDS = 600;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.required' => 'Enter the username from your instructor\'s slip.',
            'password.required' => 'Enter your password.',
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        /** @var User|null $user */
        $user = User::query()->where('username', $this->string('username'))->first();

        if ($user && $user->status === User::STATUS_LOCKED) {
            $this->recordAttempt(false);

            throw ValidationException::withMessages([
                'username' => 'This account is locked. Ask your instructor or the school admin to reset it.',
            ]);
        }

        if ($user && $user->status === User::STATUS_PENDING) {
            $this->recordAttempt(false);

            throw ValidationException::withMessages([
                'username' => 'This account is still waiting for your instructor to approve it.',
            ]);
        }

        if (! Auth::attempt($this->only('username', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey(), self::DECAY_SECONDS);
            $this->recordAttempt(false);
            $this->lockAccountIfNeeded($user);

            throw ValidationException::withMessages([
                'username' => 'That username and password do not match. Check if Caps Lock is on.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());
        $this->recordAttempt(true);

        $this->user()->forceFill(['last_active_at' => now()])->save();
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        Event::dispatch(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'username' => "Too many tries. Wait {$this->humanizeMinutes($seconds)} or ask your instructor to reset the account.",
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip());
    }

    protected function lockAccountIfNeeded(?User $user): void
    {
        if (! $user || $user->status !== User::STATUS_ACTIVE) {
            return;
        }

        if (RateLimiter::attempts($this->throttleKey()) >= self::MAX_ATTEMPTS) {
            $user->forceFill(['status' => User::STATUS_LOCKED])->save();
        }
    }

    protected function recordAttempt(bool $successful): void
    {
        LoginAttempt::create([
            'username' => (string) $this->string('username'),
            'ip_address' => $this->ip(),
            'successful' => $successful,
            'attempted_at' => now(),
        ]);
    }

    protected function humanizeMinutes(int $seconds): string
    {
        $minutes = (int) ceil($seconds / 60);

        return $minutes <= 1 ? 'a minute' : "{$minutes} minutes";
    }
}
