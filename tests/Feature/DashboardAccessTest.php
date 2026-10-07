<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_sent_to_sign_in(): void
    {
        $this->get('/dashboard')->assertRedirect(route('sign-in'));
        $this->get('/student')->assertRedirect(route('sign-in'));
        $this->get('/instructor')->assertRedirect(route('sign-in'));
        $this->get('/admin')->assertRedirect(route('sign-in'));
    }

    public function test_the_dashboard_route_forwards_each_role_to_its_own_screen(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get('/dashboard')->assertRedirect(route('student.dashboard'));

        $this->actingAs(User::factory()->instructor()->create())
            ->get('/dashboard')->assertRedirect(route('instructor.dashboard'));

        $this->actingAs(User::factory()->admin()->create())
            ->get('/dashboard')->assertRedirect(route('admin.dashboard'));
    }

    public function test_a_student_cannot_open_the_instructor_or_admin_dashboards(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)->get('/instructor')->assertRedirect(route('dashboard'));
        $this->actingAs($student)->get('/admin')->assertRedirect(route('dashboard'));
    }

    public function test_an_instructor_cannot_open_the_admin_dashboard(): void
    {
        $this->actingAs(User::factory()->instructor()->create())
            ->get('/admin')->assertRedirect(route('dashboard'));
    }
}
