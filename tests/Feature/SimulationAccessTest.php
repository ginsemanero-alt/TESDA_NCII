<?php

namespace Tests\Feature;

use App\Models\Section;
use App\Models\SimulationAttempt;
use App\Models\User;
use App\Simulations\Resistor\ResistorLab;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimulationAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_a_student_can_open_the_simulation_list_and_the_lab(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get(route('student.simulations.index'))
            ->assertOk()
            ->assertSee('Resistor lab')
            ->assertSee('ELC724205');

        $this->actingAs($student)
            ->get(route('student.simulations.show', ResistorLab::KEY))
            ->assertOk()
            ->assertSee('id="resistor-lab"', false)
            ->assertSee('data-checkpoints=', false)
            ->assertSee('data-token=', false);
    }

    public function test_an_unknown_simulation_is_not_found(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.simulations.show', 'capacitor-lab'))
            ->assertNotFound();
    }

    public function test_instructors_and_admins_cannot_open_student_simulations(): void
    {
        foreach ([User::factory()->instructor()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)->get(route('student.simulations.index'))->assertRedirect(route('dashboard'));
            $this->actingAs($user)->get(route('student.simulations.show', ResistorLab::KEY))->assertRedirect(route('dashboard'));
            $this->actingAs($user)
                ->postJson(route('student.simulations.attempts.store', ResistorLab::KEY), ['token' => str_repeat('a', 40), 'answers' => [], 'score' => 0])
                ->assertRedirect(route('dashboard'));
        }

        $this->assertSame(0, SimulationAttempt::count());
    }

    public function test_guests_are_sent_to_sign_in(): void
    {
        $this->get(route('student.simulations.index'))->assertRedirect(route('sign-in'));
        $this->get(route('student.simulations.show', ResistorLab::KEY))->assertRedirect(route('sign-in'));
        $this->post(route('student.simulations.attempts.store', ResistorLab::KEY))->assertRedirect(route('sign-in'));
    }

    public function test_the_student_dashboard_shows_the_last_lab_result(): void
    {
        $student = User::factory()->student()->create();
        SimulationAttempt::factory()->create(['user_id' => $student->id, 'score' => 4, 'max_score' => 5]);

        $this->actingAs($student)
            ->get(route('student.dashboard'))
            ->assertOk()
            ->assertSee('Simulation lab')
            ->assertSee('4/5')
            ->assertSee('Passed');
    }

    public function test_the_instructor_sees_each_students_best_lab_attempt(): void
    {
        $section = Section::factory()->create();
        $instructor = User::factory()->instructor()->create(['section_id' => $section->id]);
        $student = User::factory()->student()->create(['section_id' => $section->id]);
        SimulationAttempt::factory()->create(['user_id' => $student->id, 'score' => 2, 'max_score' => 5]);
        SimulationAttempt::factory()->create(['user_id' => $student->id, 'score' => 5, 'max_score' => 5]);

        $this->actingAs($instructor)
            ->get(route('instructor.classes.index', ['section' => $instructor->section_id]))
            ->assertOk()
            ->assertSee('Lab 5/5');
    }
}
