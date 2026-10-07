<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\User;
use App\Simulations\Resistor\ResistorLab;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimulationModulePageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_a_simulation_page_renders_the_island_container(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 1]);
        ModulePage::factory()->simulation()->create([
            'module_id' => $module->id,
            'number' => 1,
            'heading' => 'Resistor lab: read, measure, calculate',
            'body' => 'Turn the resistor and check it with the multimeter.',
        ]);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.modules.show', $module))
            ->assertOk()
            ->assertSee('Resistor lab: read, measure, calculate')
            ->assertSee('Turn the resistor and check it with the multimeter.')
            ->assertSee('id="resistor-lab"', false)
            ->assertSee('data-module-page=', false)
            ->assertSee(route('student.simulations.attempts.store', ResistorLab::KEY));
    }

    public function test_a_text_page_still_renders_as_before(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 1]);
        ModulePage::factory()->create([
            'module_id' => $module->id,
            'number' => 1,
            'heading' => 'Reading the bill of materials',
            'body' => 'Check each part against the <b>list</b>.',
        ]);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.modules.show', $module))
            ->assertOk()
            ->assertSee('Reading the bill of materials')
            // Still escaped plain text.
            ->assertSee('Check each part against the &lt;b&gt;list&lt;/b&gt;.', false)
            ->assertDontSee('data-simulation-island', false)
            ->assertDontSee('simulations/resistor', false);
    }

    public function test_a_page_pointing_at_an_unknown_simulation_falls_back_to_text(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 1]);
        ModulePage::factory()->simulation('retired-lab')->create(['module_id' => $module->id, 'number' => 1, 'body' => 'Fallback text.']);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('student.modules.show', $module))
            ->assertOk()
            ->assertSee('Fallback text.')
            ->assertDontSee('data-simulation-island', false);
    }

    public function test_an_instructor_can_add_a_simulation_page_from_the_fixed_list(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 0]);
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->get(route('instructor.lessons.edit', $module))
            ->assertOk()
            ->assertSee('Page type')
            ->assertSee('Resistor lab (ELC724205, ELC311201)');

        $this->actingAs($instructor)
            ->post(route('instructor.lessons.pages.store', $module), [
                'heading' => 'Try it on the bench',
                'type' => 'simulation',
                'simulation_key' => ResistorLab::KEY,
                'body' => '',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('module_pages', [
            'module_id' => $module->id,
            'number' => 1,
            'type' => ModulePage::TYPE_SIMULATION,
            'simulation_key' => ResistorLab::KEY,
            'body' => '',
        ]);
    }

    public function test_an_unknown_simulation_key_is_rejected_and_text_pages_still_need_a_body(): void
    {
        $module = Module::factory()->create(['competency_id' => Competency::factory(), 'page_count' => 0]);
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->post(route('instructor.lessons.pages.store', $module), ['heading' => 'Bad', 'type' => 'simulation', 'simulation_key' => 'nuclear-lab'])
            ->assertSessionHasErrors('simulation_key');

        $this->actingAs($instructor)
            ->post(route('instructor.lessons.pages.store', $module), ['heading' => 'No body', 'type' => 'text', 'body' => ''])
            ->assertSessionHasErrors('body');

        $this->assertSame(0, $module->pages()->count());
    }

    public function test_saving_a_text_page_without_a_type_keeps_it_text(): void
    {
        $page = ModulePage::factory()->create(['module_id' => Module::factory()->create(['competency_id' => Competency::factory()])->id, 'number' => 1]);

        $this->actingAs(User::factory()->instructor()->create())
            ->patch(route('instructor.lessons.pages.update', $page), ['heading' => 'New heading', 'body' => 'New body'])
            ->assertRedirect();

        $this->assertDatabaseHas('module_pages', ['id' => $page->id, 'type' => ModulePage::TYPE_TEXT, 'simulation_key' => null, 'body' => 'New body']);
    }
}
