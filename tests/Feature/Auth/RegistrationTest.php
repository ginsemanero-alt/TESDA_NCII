<?php

namespace Tests\Feature\Auth;

use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_student_can_request_an_account_that_starts_pending(): void
    {
        $section = Section::factory()->create();

        $response = $this->post('/register', [
            'full_name' => 'Dela Cruz, Jhon Rey P.',
            'lrn' => '123456789012',
            'section' => $section->name,
            'password' => 'longenough',
        ]);

        $response->assertRedirect(route('sign-in'));
        $response->assertSessionHas('status');

        $user = User::query()->where('lrn', '123456789012')->first();
        $this->assertNotNull($user);
        $this->assertSame(User::STATUS_PENDING, $user->status);
        $this->assertSame(User::ROLE_STUDENT, $user->role);
        $this->assertSame($section->id, $user->section_id);
        $this->assertNotEmpty($user->username);
        $this->assertGuest();
    }

    public function test_registration_validates_its_input(): void
    {
        $this->post('/register', [
            'full_name' => '',
            'lrn' => '12',
            'section' => 'Nonexistent Section',
            'password' => 'short',
        ])->assertSessionHasErrors(['full_name', 'lrn', 'section', 'password']);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_generates_a_unique_username_when_names_collide(): void
    {
        $section = Section::factory()->create();
        User::factory()->create(['username' => 'jhonrey.d']);

        $this->post('/register', [
            'full_name' => 'Dela Cruz, Jhon Rey',
            'lrn' => '999999999999',
            'section' => $section->name,
            'password' => 'longenough',
        ]);

        $created = User::query()->where('lrn', '999999999999')->first();
        $this->assertNotNull($created);
        $this->assertNotSame('jhonrey.d', $created->username);
    }
}
