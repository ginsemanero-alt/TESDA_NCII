<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Send the signed-in user to the dashboard for their role.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        return redirect()->route($request->user()->dashboardRouteName());
    }
}
