<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * @var array<string, string>
     */
    protected array $filters = [
        'all' => 'Everything',
        'sign_in' => 'Sign-ins',
        'content' => 'Lessons and quizzes',
        'account' => 'Accounts',
    ];

    public function __invoke(Request $request): View
    {
        $filter = array_key_exists($request->string('filter')->toString(), $this->filters)
            ? $request->string('filter')->toString()
            : 'all';

        $search = trim($request->string('q')->toString());

        $users = User::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->orWhere('lrn', 'like', "%{$search}%")))
            ->orderByDesc('last_active_at')
            ->limit(8)
            ->get();

        $log = ActivityLog::query()
            ->when($filter !== 'all', fn ($query) => $query->where('category', $filter))
            ->latest('occurred_at')
            ->limit(8)
            ->get();

        return view('admin.dashboard', [
            'navLinks' => ['Overview' => true, 'Accounts' => false, 'Backups' => false],
            'stats' => [
                'accounts' => User::count(),
                'pending' => User::where('status', User::STATUS_PENDING)->count(),
                'signed_in_today' => User::whereDate('last_active_at', today())->count(),
                'failed_today' => LoginAttempt::where('successful', false)
                    ->whereDate('attempted_at', today())
                    ->count(),
            ],
            'roleCounts' => [
                'Students' => User::where('role', User::ROLE_STUDENT)->count(),
                'Instructors' => User::where('role', User::ROLE_INSTRUCTOR)->count(),
                'Admin' => User::where('role', User::ROLE_ADMIN)->count(),
            ],
            'users' => $users,
            'log' => $log,
            'filters' => $this->filters,
            'activeFilter' => $filter,
            'search' => $search,
            'lockedUser' => User::where('status', User::STATUS_LOCKED)->first(),
        ]);
    }
}
