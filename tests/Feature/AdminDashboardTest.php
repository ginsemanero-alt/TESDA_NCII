<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_renders_role_counts_accounts_and_the_activity_log(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(4)->create(['role' => User::ROLE_STUDENT]);
        User::factory()->create(['name' => 'Ancheta, Kim Ryan', 'username' => 'kimryan.a', 'status' => User::STATUS_LOCKED]);
        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_SYSTEM,
            'description' => 'Nightly backup finished, 42 seconds',
            'actor' => 'System',
            'device' => 'School server',
            'occurred_at' => now(),
        ]);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertOk();
        $response->assertSee('Users by role');
        $response->assertSee('kimryan.a');
        $response->assertSee('Nightly backup finished, 42 seconds');
        $response->assertSee('Needs a look');
    }

    public function test_the_account_search_filters_by_username(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['name' => 'Dela Cruz, Jhon Rey', 'username' => 'jhonrey.m']);
        User::factory()->create(['name' => 'Galvez, Lianne', 'username' => 'galvez.l']);

        $this->actingAs($admin)->get(route('admin.dashboard', ['q' => 'jhonrey']))
            ->assertSee('jhonrey.m')
            ->assertDontSee('galvez.l');
    }

    public function test_an_admin_can_unlock_a_locked_account(): void
    {
        $admin = User::factory()->admin()->create();
        $locked = User::factory()->locked()->create();

        $this->actingAs($admin)->post(route('admin.accounts.unlock', $locked))
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertSame(User::STATUS_ACTIVE, $locked->refresh()->status);
    }

    public function test_an_admin_can_approve_a_pending_account(): void
    {
        $admin = User::factory()->admin()->create();
        $pending = User::factory()->pending()->create();

        $this->actingAs($admin)->post(route('admin.accounts.approve', $pending));

        $this->assertSame(User::STATUS_ACTIVE, $pending->refresh()->status);
    }

    public function test_an_admin_can_reset_a_password(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        $originalHash = $user->password;

        $this->actingAs($admin)->post(route('admin.accounts.reset-password', $user))
            ->assertSessionHas('notice');

        $this->assertNotSame($originalHash, $user->refresh()->password);
        $this->assertFalse(Hash::check('old-password', $user->password));
    }

    public function test_students_cannot_reach_admin_account_actions(): void
    {
        $student = User::factory()->student()->create();
        $locked = User::factory()->locked()->create();

        $this->actingAs($student)->post(route('admin.accounts.unlock', $locked))
            ->assertRedirect(route('dashboard'));

        $this->assertSame(User::STATUS_LOCKED, $locked->refresh()->status);
    }
}
