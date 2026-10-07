<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\ModulePage;
use App\Models\SimulationAttempt;
use App\Simulations\Circuit\CircuitSandbox;
use App\Simulations\Resistor\ResistorLab;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Unit codes as listed on p.1 of the TESDA Training Regulations for
     * Electronic Products Assembly and Servicing NC II.
     */
    private const TR_CODES = [
        'ELC315202', 'ELC311203', 'ELC311201', 'ELC311202', 'ELC724201', 'ELC724202', 'ELC724205',
        'ELC724335', 'ELC724336', 'ELC724337',
    ];

    public function test_the_seeder_runs_and_every_competency_code_is_in_the_training_regulations(): void
    {
        $this->seed(DatabaseSeeder::class);

        $codes = Competency::query()->pluck('code')->all();

        $this->assertNotEmpty($codes);
        foreach ($codes as $code) {
            $this->assertContains($code, self::TR_CODES, "{$code} is not a unit code in the EPAS NC II TR");
        }
        $this->assertContains('ELC724205', $codes);
        $this->assertDatabaseHas('competencies', ['code' => 'ELC724205', 'title' => 'Test electronic components']);
    }

    public function test_the_seeded_lesson_contains_the_resistor_lab(): void
    {
        $this->seed(DatabaseSeeder::class);

        $page = ModulePage::query()->where('simulation_key', ResistorLab::KEY)->with('module.competency')->sole();

        $this->assertSame(ModulePage::TYPE_SIMULATION, $page->type);
        $this->assertSame('ELC724205', $page->module->competency->code);
        $this->assertSame('Describe resistance and identify resistors', $page->module->title);
        $this->assertSame($page->module->pages()->count(), $page->module->page_count);
        $this->assertGreaterThan(0, SimulationAttempt::count());
    }

    public function test_the_seeded_lesson_contains_the_circuit_workbench(): void
    {
        $this->seed(DatabaseSeeder::class);

        $page = ModulePage::query()->where('simulation_key', CircuitSandbox::KEY)->with('module.competency')->sole();

        $this->assertSame(ModulePage::TYPE_SIMULATION, $page->type);
        $this->assertSame('ELC724202', $page->module->competency->code);
    }
}
