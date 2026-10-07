<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Section;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AccountsController extends Controller
{
    public function index(Request $request): View
    {
        $search = trim($request->string('q')->toString());
        $role = $request->string('role')->toString();

        $accounts = User::query()
            ->with('section')
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->orWhere('lrn', 'like', "%{$search}%")))
            ->when(in_array($role, [User::ROLE_STUDENT, User::ROLE_INSTRUCTOR, User::ROLE_ADMIN], true),
                fn ($query) => $query->where('role', $role))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return view('admin.accounts.index', [
            'navLinks' => ['Overview' => false, 'Accounts' => true, 'Backups' => false],
            'accounts' => $accounts,
            'search' => $search,
            'role' => $role,
            'roleCounts' => [
                'all' => User::count(),
                User::ROLE_STUDENT => User::where('role', User::ROLE_STUDENT)->count(),
                User::ROLE_INSTRUCTOR => User::where('role', User::ROLE_INSTRUCTOR)->count(),
                User::ROLE_ADMIN => User::where('role', User::ROLE_ADMIN)->count(),
            ],
        ]);
    }

    public function create(): View
    {
        return view('admin.accounts.create', [
            'navLinks' => ['Overview' => false, 'Accounts' => true, 'Backups' => false],
            'sections' => Section::orderBy('grade_level')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9._-]+$/i', Rule::unique(User::class, 'username')],
            'role' => ['required', Rule::in([User::ROLE_STUDENT, User::ROLE_INSTRUCTOR, User::ROLE_ADMIN])],
            'lrn' => ['nullable', 'digits:12', Rule::requiredIf($request->input('role') === User::ROLE_STUDENT)],
            'section_id' => ['nullable', Rule::exists(Section::class, 'id'), Rule::requiredIf(
                in_array($request->input('role'), [User::ROLE_STUDENT, User::ROLE_INSTRUCTOR], true)
            )],
        ]);

        $temporary = Str::upper(Str::random(4)).'-EPAS';

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'password' => Hash::make($temporary),
            'role' => $validated['role'],
            'status' => User::STATUS_ACTIVE,
            'lrn' => $validated['lrn'] ?? null,
            'section_id' => $validated['section_id'] ?? null,
        ]);

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_ACCOUNT,
            'description' => "Created {$user->role} account {$user->username}",
            'actor' => "{$request->user()->name}, admin",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return redirect()
            ->route('admin.accounts.index')
            ->with('notice', "Account {$user->username} created. Temporary password is {$temporary} — hand it over in person.");
    }
}
