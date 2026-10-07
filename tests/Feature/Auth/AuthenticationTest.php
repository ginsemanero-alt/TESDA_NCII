<?php

namespace Tests\Feature\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sign_in_screen_renders_for_guests(): void
    {
        $this->get('/sign-in')->assertOk()->assertSee('Sign in to pick up where you stopped.');
    }

    public function test_a_signed_in_user_is_redirected_away_from_the_sign_in_screen(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/sign-in')
            ->assertRedirect(route('dashboard'));
    }

    public function test_students_authenticate_and_land_on_the_student_dashboard(): void
    {
        $user = User::factory()->create([
            'username' => 'jhonrey.m',
            'password' => Hash::make('secret-pass'),
            'role' => User::ROLE_STUDENT,
        ]);

        $response = $this->post('/login', [
            'username' => 'jhonrey.m',
            'password' => 'secret-pass',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('login_attempts', ['username' => 'jhonrey.m', 'successful' => true]);
        $this->assertNotNull($user->refresh()->last_active_at);
    }

    public function test_instructors_and_admins_reach_their_own_dashboards(): void
    {
        $instructor = User::factory()->instructor()->create(['password' => Hash::make('pw12345678')]);
        $this->post('/login', ['username' => $instructor->username, 'password' => 'pw12345678'])
            ->assertRedirect(route('dashboard'));
        $this->get(route('dashboard'))->assertRedirect(route('instructor.dashboard'));

        $this->post('/logout');

        $admin = User::factory()->admin()->create(['password' => Hash::make('pw12345678')]);
        $this->post('/login', ['username' => $admin->username, 'password' => 'pw12345678']);
        $this->get(route('dashboard'))->assertRedirect(route('admin.dashboard'));
    }

    public function test_a_wrong_password_is_rejected_and_recorded(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse')]);

        $this->post('/login', ['username' => $user->username, 'password' => 'wrong'])
            ->assertSessionHasErrors('username');

        $this->assertGuest();
        $this->assertDatabaseHas('login_attempts', ['username' => $user->username, 'successful' => false]);
    }

    public function test_a_locked_account_cannot_sign_in_even_with_the_right_password(): void
    {
        $user = User::factory()->locked()->create(['password' => Hash::make('right-pass')]);

        $this->post('/login', ['username' => $user->username, 'password' => 'right-pass'])
            ->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_a_pending_account_cannot_sign_in(): void
    {
        $user = User::factory()->pending()->create(['password' => Hash::make('right-pass')]);

        $this->post('/login', ['username' => $user->username, 'password' => 'right-pass'])
            ->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_five_wrong_passwords_lock_the_account(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse')]);

        for ($i = 0; $i < LoginRequest::MAX_ATTEMPTS; $i++) {
            $this->post('/login', ['username' => $user->username, 'password' => 'nope']);
        }

        $this->assertSame(User::STATUS_LOCKED, $user->refresh()->status);
    }

    public function test_users_can_sign_out(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/logout')
            ->assertRedirect(route('landing'));

        $this->assertGuest();
    }
}
