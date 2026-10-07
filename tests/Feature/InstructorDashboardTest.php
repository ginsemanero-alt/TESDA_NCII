<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\JobSheetSubmission;
use App\Models\Module;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstructorDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function makeClass(): array
    {
        $section = Section::factory()->create(['name' => 'Grade 12 Ampere']);
        $instructor = User::factory()->instructor()->create(['section_id' => $section->id]);
        $competency = Competency::factory()->create(['short_title' => 'Assemble electronic products']);
        Module::factory()->create(['competency_id' => $competency->id, 'number' => 1, 'page_count' => 10]);
        $students = User::factory()->count(3)->create(['role' => User::ROLE_STUDENT, 'section_id' => $section->id]);

        return [$section, $instructor, $students];
    }

    public function test_it_renders_the_section_overview_and_sign_off_queue(): void
    {
        [$section, $instructor, $students] = $this->makeClass();

        JobSheetSubmission::factory()->create([
            'user_id' => $students->first()->id,
            'section_id' => $section->id,
            'label' => 'Job sheet 3.2, solder 12 resistors on the trainer board',
        ]);

        $response = $this->actingAs($instructor)->get(route('instructor.dashboard'));

        $response->assertOk();
        $response->assertSee('Grade 12 Ampere');
        $response->assertSee('Check these today');
        $response->assertSee('Job sheet 3.2, solder 12 resistors on the trainer board');
        $response->assertSee('Assemble electronic products');
    }

    public function test_an_instructor_can_sign_off_a_job_sheet(): void
    {
        [$section, $instructor, $students] = $this->makeClass();
        $submission = JobSheetSubmission::factory()->create([
            'user_id' => $students->first()->id,
            'section_id' => $section->id,
        ]);

        $this->actingAs($instructor)
            ->patch(route('instructor.job-sheets.update', $submission), ['decision' => 'achieved'])
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertSame(JobSheetSubmission::STATUS_ACHIEVED, $submission->refresh()->status);
        $this->assertSame($instructor->id, $submission->reviewed_by);
    }

    public function test_an_instructor_can_post_an_announcement_that_reaches_students(): void
    {
        [$section, $instructor, $students] = $this->makeClass();

        $this->actingAs($instructor)->post(route('instructor.announcements.store'), [
            'section_id' => $section->id,
            'body' => 'Practical starts 1 PM sa shop.',
        ])->assertRedirect();

        $this->assertDatabaseHas('announcements', [
            'section_id' => $section->id,
            'author_id' => $instructor->id,
            'body' => 'Practical starts 1 PM sa shop.',
        ]);

        $this->actingAs($students->first())->get(route('student.dashboard'))
            ->assertSee('Practical starts 1 PM sa shop.');
    }

    public function test_a_student_cannot_sign_off_job_sheets(): void
    {
        [$section, , $students] = $this->makeClass();
        $submission = JobSheetSubmission::factory()->create(['section_id' => $section->id, 'user_id' => $students->first()->id]);

        $this->actingAs($students->first())
            ->patch(route('instructor.job-sheets.update', $submission), ['decision' => 'achieved'])
            ->assertRedirect(route('dashboard'));

        $this->assertSame(JobSheetSubmission::STATUS_PENDING, $submission->refresh()->status);
    }
}
