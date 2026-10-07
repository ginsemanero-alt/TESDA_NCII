<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\ModuleProgress;
use App\Models\SimulationAttempt;
use App\Models\User;
use App\Simulations\Circuit\CircuitSandbox;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SolvesCircuitChallenges;
use Tests\TestCase;

class CircuitSandboxAttemptTest extends TestCase
{
    use RefreshDatabase;
    use SolvesCircuitChallenges;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    /**
     * @return array{token: string, checkpoints: list<array<string, mixed>>}
     */
    private function issued(TestResponse $response): array
    {
        $html = $response->getContent();
        preg_match('/data-token="([^"]+)"/', $html, $token);
        preg_match("/data-checkpoints='([^']+)'/", $html, $checkpoints);

        return [
            'token' => $token[1],
            'checkpoints' => json_decode(html_entity_decode($checkpoints[1], ENT_QUOTES), true),
        ];
    }

    private function url(): string
    {
        return route('student.simulations.attempts.store', CircuitSandbox::KEY);
    }

    /** @return array<string, array<string, mixed>> */
    private function allCorrect(array $checkpoints): array
    {
        $answers = [];
        foreach ($checkpoints as $cp) {
            $answers[$cp['id']] = $this->correct($cp);
        }

        return $answers;
    }

    public function test_a_student_can_open_the_workbench_and_it_is_listed_beside_the_resistor_lab(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)
            ->get(route('student.simulations.index'))
            ->assertOk()
            ->assertSee('Circuit workbench')
            ->assertSee('Resistor lab');

        $response = $this->actingAs($student)->get(route('student.simulations.show', CircuitSandbox::KEY));
        $response->assertOk()
            ->assertSee('data-simulation="circuit-sandbox"', false)
            ->assertSee(asset('simulations/circuit'), false);

        $issued = $this->issued($response);
        $this->assertCount(5, $issued['checkpoints']);
        $this->assertSame(40, strlen($issued['token']));
    }

    public function test_instructors_and_guests_cannot_reach_it(): void
    {
        $this->get(route('student.simulations.show', CircuitSandbox::KEY))->assertRedirect(route('sign-in'));
        $this->actingAs(User::factory()->instructor()->create())
            ->get(route('student.simulations.show', CircuitSandbox::KEY))
            ->assertRedirect(route('dashboard'));
    }

    public function test_a_perfect_attempt_is_graded_by_the_server_with_no_browser_score(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', CircuitSandbox::KEY)));

        // No "score" in the request at all: the circuit lab is graded only on the server.
        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->allCorrect($issued['checkpoints'])])
            ->assertOk()
            ->assertJsonPath('attempt.score', 5)
            ->assertJsonPath('attempt.max_score', 5)
            ->assertJsonPath('attempt.passed', true)
            ->assertJsonCount(5, 'results')
            ->assertJsonStructure(['next' => ['token', 'checkpoints']]);

        $attempt = SimulationAttempt::sole();
        $this->assertSame(CircuitSandbox::KEY, $attempt->simulation_key);
        $this->assertSame(5, $attempt->score);
        $this->assertDatabaseHas('activity_logs', ['description' => 'Circuit workbench: 5 of 5 checkpoints, passed']);
    }

    public function test_a_score_sent_by_the_browser_is_ignored_for_this_lab(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', CircuitSandbox::KEY)));

        // Blank answers but a claim of full marks: the server grades what it was given.
        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => [], 'score' => 5])
            ->assertOk()
            ->assertJsonPath('attempt.score', 0)
            ->assertJsonPath('attempt.passed', false);

        $this->assertSame(0, SimulationAttempt::sole()->score);
    }

    public function test_some_wrong_answers_lower_the_score_and_each_result_says_which(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', CircuitSandbox::KEY)));
        $answers = $this->allCorrect($issued['checkpoints']);
        $spoiled = $issued['checkpoints'][0]['id'];
        $answers[$spoiled] = ['amps' => 123.0, 'volts' => 123.0, 'ohms' => 123.0, 'cause' => 'flat', 'doc' => $issued['checkpoints'][0]['doc'] ?? ['parts' => [], 'wires' => []]];

        $response = $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $answers])
            ->assertOk()
            ->assertJsonPath('attempt.score', 4);

        $results = collect($response->json('results'))->keyBy('id');
        $this->assertFalse($results[$spoiled]['correct']);
        $this->assertSame(4, $results->where('correct', true)->count());
    }

    public function test_a_malformed_circuit_is_refused_and_nothing_is_saved(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', CircuitSandbox::KEY)));
        $answers = $this->allCorrect($issued['checkpoints']);
        $withDoc = collect($issued['checkpoints'])->first(fn (array $cp): bool => isset($cp['doc']));

        $answers[$withDoc['id']]['doc'] = ['parts' => [['id' => 'X1', 'type' => 'nuclear']], 'wires' => []];

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $answers])
            ->assertStatus(422);

        $this->assertSame(0, SimulationAttempt::count());
    }

    public function test_a_set_of_questions_can_only_be_submitted_once_and_not_by_someone_else(): void
    {
        $owner = User::factory()->student()->create();
        $other = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($owner)->get(route('student.simulations.show', CircuitSandbox::KEY)));
        $payload = ['token' => $issued['token'], 'answers' => $this->allCorrect($issued['checkpoints'])];

        $this->actingAs($other)->postJson($this->url(), $payload)->assertStatus(422);
        $this->actingAs($owner)->postJson($this->url(), $payload)->assertOk();
        $this->actingAs($owner)->postJson($this->url(), $payload)->assertStatus(422);

        $this->assertSame(1, SimulationAttempt::count());
        $this->assertSame($owner->id, SimulationAttempt::sole()->user_id);
    }

    public function test_the_resistor_lab_still_requires_its_browser_score(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', 'resistor-lab')));

        $this->actingAs($student)
            ->postJson(route('student.simulations.attempts.store', 'resistor-lab'), ['token' => $issued['token'], 'answers' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors('score');
    }

    public function test_the_workbench_works_as_a_lesson_page_and_completes_the_module(): void
    {
        $student = User::factory()->student()->create();
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 2]);
        ModulePage::factory()->create(['module_id' => $module->id, 'number' => 1]);
        $page = ModulePage::factory()->simulation(CircuitSandbox::KEY)->create(['module_id' => $module->id, 'number' => 2]);

        $response = $this->actingAs($student)->get(route('student.modules.show', [$module, 'p' => 2]));
        $response->assertOk()->assertSee('data-simulation="circuit-sandbox"', false);
        $issued = $this->issued($response);
        ModuleProgress::query()->where('user_id', $student->id)->update(['status' => ModuleProgress::STATUS_IN_PROGRESS, 'current_page' => 1]);

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->allCorrect($issued['checkpoints'])])
            ->assertOk();

        $this->assertSame($page->id, SimulationAttempt::sole()->module_page_id);
        $this->assertDatabaseHas('module_progress', ['user_id' => $student->id, 'module_id' => $module->id, 'status' => ModuleProgress::STATUS_DONE]);
    }

    public function test_an_instructor_can_choose_the_workbench_for_a_lesson_page(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 0]);
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->get(route('instructor.lessons.edit', $module))
            ->assertOk()
            ->assertSee('Circuit workbench (ELC724202, ELC724205, ELC311201)');

        $this->actingAs($instructor)
            ->post(route('instructor.lessons.pages.store', $module), ['heading' => 'Build it yourself', 'type' => 'simulation', 'simulation_key' => CircuitSandbox::KEY, 'body' => ''])
            ->assertRedirect();

        $this->assertDatabaseHas('module_pages', ['module_id' => $module->id, 'simulation_key' => CircuitSandbox::KEY]);
    }
}
