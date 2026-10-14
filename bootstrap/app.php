<?php

use App\Http\Middleware\EnsureUserRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Railway terminates TLS at its edge; trust its X-Forwarded-* headers so
        // asset URLs come out as https instead of being blocked as mixed content.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role' => EnsureUserRole::class,
        ]);

        $middleware->redirectGuestsTo(fn () => route('sign-in'));
        $middleware->redirectUsersTo(fn () => route('dashboard'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 419: the form was older than the session (Back button, idle tab, signed
        // out in another tab). Finish a sign-out anyway, and send any other form
        // back with a fresh token instead of the bare "Page Expired" screen.
        $exceptions->render(function (HttpException $e, Request $request) {
            if ($e->getStatusCode() !== 419 || $request->expectsJson()) {
                return null;
            }

            if ($request->routeIs('logout')) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('landing');
            }

            $message = 'That page was out of date, so nothing was sent. Please try again.';

            return redirect()->back()
                ->withInput($request->except('_token', 'password', 'password_confirmation'))
                ->with(Auth::check() ? 'notice' : 'status', $message);
        });
    })->create();
