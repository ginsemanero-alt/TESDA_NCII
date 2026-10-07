<?php

namespace Tests\Feature;

use App\Models\JobSheetSubmission;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardInteractivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_dashboard_loads_sweetalert(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.dashboard'))
            ->assertSee('sweetalert2', false);

        $this->actingAs(User::factory()->instructor()->create(['section_id' => Section::factory()->create()->id]))
            ->get(route('instructor.dashboard'))
            ->assertSee('sweetalert2', false);

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertSee('sweetalert2', false);
    }

    public function test_consequential_actions_carry_a_confirmation_prompt(): void
    {
        $section = Section::factory()->create();
        $instructor = User::factory()->instructor()->create(['section_id' => $section->id]);
        JobSheetSubmission::factory()->create([
            'section_id' => $section->id,
            'user_id' => User::factory()->create(['section_id' => $section->id, 'role' => User::ROLE_STUDENT])->id,
        ]);

        $this->actingAs($instructor)->get(route('instructor.dashboard'))
            ->assertSee('data-confirm', false)
            ->assertSee('Send this back?', false);

        $admin = User::factory()->admin()->create();
        User::factory()->locked()->create();

        $this->actingAs($admin)->get(route('admin.dashboard'))
            ->assertSee('Reset this password?', false)
            ->assertSee('Unlock this account?', false);
    }

    public function test_dashboard_shortcuts_link_to_real_pages(): void
    {
        $section = Section::factory()->create();
        $instructor = User::factory()->instructor()->create(['section_id' => $section->id]);

        $this->actingAs($instructor)
            ->get(route('instructor.dashboard'))
            ->assertSee(route('instructor.lessons.index'), false)
            ->assertSee(route('instructor.quizzes.create'), false)
            ->assertDontSee('data-shortcut disabled', false);
    }
}
