<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Models\Section;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the sign-in screen.
     */
    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        // no-store keeps the browser from restoring this page on Back after a
        // sign-out, which would submit a CSRF token the sign-out already retired.
        return response()->view('auth.sign-in', [
            'sections' => Section::query()->orderBy('grade_level')->orderBy('name')->get(),
        ])->header('Cache-Control', 'no-store, private');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_SIGN_IN,
            'description' => 'Signed in',
            'actor' => "{$user->name}, {$user->role}",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('landing');
    }
}
