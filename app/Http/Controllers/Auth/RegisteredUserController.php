<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\ActivityLog;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class RegisteredUserController extends Controller
{
    /**
     * Register a new student account in the pending state, awaiting instructor approval.
     */
    public function store(RegisterRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $section = Section::query()->where('name', $data['section'])->firstOrFail();

        $user = User::create([
            'name' => $data['full_name'],
            'username' => $this->uniqueUsername($data['full_name']),
            'password' => $data['password'],
            'role' => User::ROLE_STUDENT,
            'status' => User::STATUS_PENDING,
            'lrn' => $data['lrn'],
            'section_id' => $section->id,
        ]);

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_ACCOUNT,
            'description' => "New student account awaiting approval: {$user->username}",
            'actor' => $user->name,
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return redirect()
            ->route('sign-in')
            ->with('status', "Account requested for {$user->username}. Your instructor approves it before the modules open, usually the same day.");
    }

    protected function uniqueUsername(string $fullName): string
    {
        $clean = Str::of($fullName)->replace(',', ' ')->squish();
        $parts = explode(' ', $clean->toString());
        $surname = $parts[0] ?? 'student';
        $given = $parts[1] ?? $surname;

        $base = Str::lower(Str::slug($given, '').'.'.Str::substr(Str::slug($surname, ''), 0, 1));
        $base = $base !== '.' ? $base : 'student';

        $username = $base;
        $suffix = 1;

        while (User::query()->where('username', $username)->exists()) {
            $username = $base.(++$suffix);
        }

        return $username;
    }
}
