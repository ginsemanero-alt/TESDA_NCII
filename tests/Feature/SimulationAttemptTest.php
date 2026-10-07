<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\ModuleProgress;
use App\Models\SimulationAttempt;
use App\Models\User;
use App\Simulations\Resistor\ColorCode;
use App\Simulations\Resistor\ResistorLab;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SimulationAttemptTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    /**
     * Pull the token and checkpoints the page handed the island.
     *
     * @return array{token: string, checkpoints: list<array<string, mixed>>}
     */
    protected function issued(TestResponse $response): array
    {
        $html = $response->getContent();
        preg_match('/data-token="([^"]+)"/', $html, $token);
        preg_match("/data-checkpoints='([^']+)'/", $html, $checkpoints);

        return [
            'token' => $token[1],
            'checkpoints' => json_decode(html_entity_decode($checkpoints[1], ENT_QUOTES), true),
        ];
    }

    /**
     * The right answer to every checkpoint, worked out independently with ColorCode.
     *
     * @param  list<array<string, mixed>>  $checkpoints
     * @return array<string, array<string, mixed>>
     */
    protected function correctAnswers(array $checkpoints): array
    {
        $answers = [];
        foreach ($checkpoints as $checkpoint) {
            $answers[$checkpoint['id']] = match ($checkpoint['type']) {
                'read' => ['ohms' => ColorCode::read($checkpoint['bands'])['ohms']],
                'bands' => ['bands' => $this->bandsFor($checkpoint['ohms'], $checkpoint['tolerance'])],
                'role' => ['band' => $checkpoint['role']],
                'current' => ['amps' => $checkpoint['volts'] / $checkpoint['ohms']],
                'tolerance' => ['within' => $checkpoint['measured'] >= ColorCode::read($checkpoint['bands'])['min']
                    && $checkpoint['measured'] <= ColorCode::read($checkpoint['bands'])['max']],
            };
        }

        return $answers;
    }

    /**
     * @return list<string>
     */
    protected function bandsFor(float $ohms, float $tolerance): array
    {
        foreach (ColorCode::allowed(0) as $a) {
            foreach (ColorCode::allowed(1) as $b) {
                foreach (ColorCode::allowed(2) as $m) {
                    foreach (ColorCode::allowed(3) as $t) {
                        $value = ColorCode::read([$a, $b, $m, $t]);
                        if (ColorCode::near($value['ohms'], $ohms, 1e-9) && $value['tolerance'] == $tolerance) {
                            return [$a, $b, $m, $t];
                        }
                    }
                }
            }
        }
        $this->fail("No band set for {$ohms} Ω ±{$tolerance}%");
    }

    protected function url(): string
    {
        return route('student.simulations.attempts.store', ResistorLab::KEY);
    }

    public function test_a_correct_attempt_is_graded_on_the_server_and_stored(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', ResistorLab::KEY)));
        $this->assertCount(5, $issued['checkpoints']);

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 5])
            ->assertOk()
            ->assertJsonPath('attempt.score', 5)
            ->assertJsonPath('attempt.passed', true)
            ->assertJsonStructure(['next' => ['token', 'checkpoints']]);

        $attempt = SimulationAttempt::sole();
        $this->assertSame($student->id, $attempt->user_id);
        $this->assertSame(5, $attempt->score);
        $this->assertSame(5, $attempt->max_score);
        $this->assertSame(ResistorLab::KEY, $attempt->simulation_key);
        $this->assertCount(5, $attempt->payload['results']);

        $this->assertDatabaseHas('activity_logs', ['category' => ActivityLog::CATEGORY_CONTENT, 'description' => 'Resistor lab: 5 of 5 checkpoints, passed']);
    }

    public function test_wrong_answers_lower_the_score(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', ResistorLab::KEY)));
        $answers = $this->correctAnswers($issued['checkpoints']);
        $answers['c4'] = ['amps' => $answers['c4']['amps'] * 10]; // a slipped prefix
        $answers['c3'] = ['band' => ($answers['c3']['band'] + 1) % 4];

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $answers, 'score' => 3])
            ->assertOk()
            ->assertJsonPath('attempt.score', 3)
            ->assertJsonPath('attempt.passed', false);
    }

    public function test_a_score_that_does_not_match_the_answers_is_refused(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', ResistorLab::KEY)));

        // Blank answers, but the request claims full marks.
        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => [], 'score' => 5])
            ->assertStatus(422);

        // More than the checkpoints could ever give.
        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 9])
            ->assertStatus(422);

        $this->assertSame(0, SimulationAttempt::count());
    }

    public function test_invalid_payloads_are_rejected(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', ResistorLab::KEY)));

        $this->actingAs($student)->postJson($this->url(), [])->assertStatus(422)->assertJsonValidationErrors(['token', 'answers', 'score']);
        $this->actingAs($student)->postJson($this->url(), ['token' => $issued['token'], 'answers' => 'all of them', 'score' => 0])->assertStatus(422);
        $this->actingAs($student)->postJson($this->url(), ['token' => $issued['token'], 'answers' => ['c1' => 'four'], 'score' => 0])->assertStatus(422);
        $this->actingAs($student)->postJson($this->url(), ['token' => $issued['token'], 'answers' => ['c2' => ['bands' => ['gold', 'black', 'red', 'gold']]], 'score' => 0])->assertStatus(422);
        $this->actingAs($student)->postJson($this->url(), ['token' => $issued['token'], 'answers' => ['c3' => ['band' => 7]], 'score' => 0])->assertStatus(422);
        $this->actingAs($student)->postJson($this->url(), ['token' => $issued['token'], 'answers' => ['c4' => ['amps' => -1]], 'score' => 0])->assertStatus(422);

        $this->assertSame(0, SimulationAttempt::count());
    }

    public function test_a_token_is_single_use_and_cannot_be_invented(): void
    {
        $student = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($student)->get(route('student.simulations.show', ResistorLab::KEY)));
        $payload = ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 5];

        $this->actingAs($student)->postJson($this->url(), $payload)->assertOk();
        $this->actingAs($student)->postJson($this->url(), $payload)->assertStatus(422);
        $this->actingAs($student)->postJson($this->url(), [...$payload, 'token' => str_repeat('x', 40)])->assertStatus(422);

        $this->assertSame(1, SimulationAttempt::count());
    }

    public function test_a_student_cannot_submit_for_another_student(): void
    {
        $owner = User::factory()->student()->create();
        $other = User::factory()->student()->create();
        $issued = $this->issued($this->actingAs($owner)->get(route('student.simulations.show', ResistorLab::KEY)));
        $payload = ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 5, 'user_id' => $owner->id];

        // Same browser session, different signed-in student: the token belongs to the owner.
        $this->actingAs($other)->postJson($this->url(), $payload)->assertStatus(422);
        $this->assertSame(0, SimulationAttempt::count());

        // A user_id in the payload is ignored; the attempt is always the signed-in student's.
        $this->actingAs($owner)->postJson($this->url(), [...$payload, 'user_id' => $other->id])->assertOk();
        $this->assertSame($owner->id, SimulationAttempt::sole()->user_id);
    }

    public function test_passing_the_lab_on_a_lesson_page_advances_module_progress(): void
    {
        $student = User::factory()->student()->create();
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 3]);
        ModulePage::factory()->create(['module_id' => $module->id, 'number' => 1]);
        $page = ModulePage::factory()->simulation()->create(['module_id' => $module->id, 'number' => 2]);
        ModulePage::factory()->create(['module_id' => $module->id, 'number' => 3]);

        $issued = $this->issued($this->actingAs($student)->get(route('student.modules.show', [$module, 'p' => 2])));
        $this->assertDatabaseHas('module_progress', ['user_id' => $student->id, 'module_id' => $module->id, 'current_page' => 2]);

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 5])
            ->assertOk();

        $this->assertSame($page->id, SimulationAttempt::sole()->module_page_id);
        $this->assertDatabaseHas('module_progress', [
            'user_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgress::STATUS_IN_PROGRESS,
            'current_page' => 2,
        ]);
    }

    public function test_passing_the_lab_on_the_last_page_completes_the_module(): void
    {
        $student = User::factory()->student()->create();
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 2]);
        ModulePage::factory()->create(['module_id' => $module->id, 'number' => 1]);
        ModulePage::factory()->simulation()->create(['module_id' => $module->id, 'number' => 2]);
        // Opening the lab page; the reader alone would already mark the last
        // page read, so reset that to prove the passed lab does it too.
        $issued = $this->issued($this->actingAs($student)->get(route('student.modules.show', [$module, 'p' => 2])));
        ModuleProgress::query()->where('user_id', $student->id)->update(['status' => ModuleProgress::STATUS_IN_PROGRESS, 'current_page' => 1]);

        $this->actingAs($student)
            ->postJson($this->url(), ['token' => $issued['token'], 'answers' => $this->correctAnswers($issued['checkpoints']), 'score' => 5])
            ->assertOk();

        $this->assertDatabaseHas('module_progress', [
            'user_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgress::STATUS_DONE,
        ]);
    }
}
