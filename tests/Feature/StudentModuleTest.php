<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\ModuleProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function moduleWithPages(int $pages = 3): Module
    {
        $module = Module::factory()->create(['page_count' => $pages, 'competency_id' => Competency::factory()]);
        foreach (range(1, $pages) as $number) {
            ModulePage::factory()->create(['module_id' => $module->id, 'number' => $number]);
        }

        return $module;
    }

    public function test_the_modules_index_lists_competencies_and_their_modules(): void
    {
        $module = $this->moduleWithPages();

        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.modules.index'))
            ->assertOk()
            ->assertSee($module->title);
    }

    public function test_reading_a_page_advances_progress(): void
    {
        $student = User::factory()->student()->create();
        $module = $this->moduleWithPages(3);

        $this->actingAs($student)->get(route('student.modules.show', ['module' => $module, 'p' => 2]))->assertOk();

        $this->assertDatabaseHas('module_progress', [
            'user_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgress::STATUS_IN_PROGRESS,
            'current_page' => 2,
        ]);
    }

    public function test_reaching_the_last_page_marks_the_module_in_progress_until_confirmed(): void
    {
        $student = User::factory()->student()->create();
        $module = $this->moduleWithPages(2);

        $this->actingAs($student)->get(route('student.modules.show', ['module' => $module, 'p' => 2]));

        $this->assertDatabaseHas('module_progress', [
            'user_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgress::STATUS_DONE,
        ]);
    }

    public function test_a_student_can_mark_a_module_complete(): void
    {
        $student = User::factory()->student()->create();
        $module = $this->moduleWithPages(4);

        $this->actingAs($student)
            ->post(route('student.modules.complete', $module))
            ->assertRedirect(route('student.modules.index'));

        $this->assertDatabaseHas('module_progress', [
            'user_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgress::STATUS_DONE,
            'current_page' => 4,
        ]);
    }

    public function test_a_module_with_no_pages_is_not_readable(): void
    {
        $module = Module::factory()->create(['page_count' => 0]);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.modules.show', $module))
            ->assertNotFound();
    }
}
