<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    /**
     * Lift a lockout so the account can sign in again.
     */
    public function unlock(Request $request, User $user): RedirectResponse
    {
        $user->update(['status' => User::STATUS_ACTIVE]);

        RateLimiter::clear(Str::lower($user->username).'|'.$request->ip());

        $this->log($request, "Unlocked {$user->username}");

        return back()->with('status', "{$user->username} can sign in again. Tell them to use the temporary password today.");
    }

    /**
     * Approve a pending account so the modules open for it.
     */
    public function approve(Request $request, User $user): RedirectResponse
    {
        $user->update(['status' => User::STATUS_ACTIVE]);

        $this->log($request, "Approved account {$user->username}");

        return back()->with('status', "Approved {$user->username}. They can sign in now.");
    }

    /**
     * Set a temporary password the admin hands over in person.
     */
    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $temporary = Str::upper(Str::random(4)).'-EPAS';

        $user->forceFill([
            'password' => Hash::make($temporary),
            'remember_token' => null,
        ])->save();

        $this->log($request, "Reset password for {$user->username}");

        return back()->with('notice', "Temporary password for {$user->username} is {$temporary}. Hand it over in person, it expires when they set a new one.");
    }

    protected function log(Request $request, string $description): void
    {
        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_ACCOUNT,
            'description' => $description,
            'actor' => "{$request->user()->name}, admin",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);
    }
}
