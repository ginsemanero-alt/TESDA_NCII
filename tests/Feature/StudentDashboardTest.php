<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Competency;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\QuizScore;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_the_students_progress_scores_and_announcements(): void
    {
        $section = Section::factory()->create(['name' => 'Grade 12 Ampere']);
        $student = User::factory()->create(['name' => 'Dela Cruz, Jhon Rey', 'role' => User::ROLE_STUDENT, 'section_id' => $section->id]);
        $instructor = User::factory()->instructor()->create(['name' => 'Villamor, Maricel', 'section_id' => $section->id]);

        $competency = Competency::factory()->create(['short_title' => 'Assemble electronic products', 'code' => 'ELC724335']);
        $m1 = Module::factory()->create(['competency_id' => $competency->id, 'number' => 1, 'page_count' => 10]);
        $m2 = Module::factory()->create(['competency_id' => $competency->id, 'number' => 2, 'page_count' => 10]);

        ModuleProgress::factory()->done()->create(['user_id' => $student->id, 'module_id' => $m1->id]);
        ModuleProgress::factory()->inProgress(4)->create(['user_id' => $student->id, 'module_id' => $m2->id]);

        QuizScore::factory()->create(['user_id' => $student->id, 'title' => 'Self-check 3.1, soldering defects', 'score' => 9]);
        Announcement::create(['section_id' => $section->id, 'author_id' => $instructor->id, 'body' => 'Bring your own soldering lead on Thursday.']);

        $response = $this->actingAs($student)->get(route('student.dashboard'));

        $response->assertOk();
        $response->assertSee('Kumusta, Jhon Rey');
        $response->assertSee('Assemble electronic products');
        $response->assertSee('ELC724335');
        $response->assertSee('Self-check 3.1, soldering defects');
        $response->assertSee('Bring your own soldering lead on Thursday.');
        $response->assertSee('70%'); // 10 done pages + 4 of 10 = 14/20
    }

    public function test_it_shows_the_first_day_state_when_nothing_is_set_up(): void
    {
        $student = User::factory()->create(['role' => User::ROLE_STUDENT]);

        $this->actingAs($student)->get(route('student.dashboard'))
            ->assertOk()
            ->assertSee('Wala pa dito');
    }
}
