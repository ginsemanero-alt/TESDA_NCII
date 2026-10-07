<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Competency;
use App\Models\JobSheetSubmission;
use App\Models\LoginAttempt;
use App\Models\Message;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\ModuleProgress;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\Section;
use App\Models\SimulationAttempt;
use App\Models\User;
use App\Simulations\Circuit\CircuitSandbox;
use App\Simulations\Resistor\ResistorLab;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $sections = collect([
            ['name' => 'Grade 11 Volt', 'grade_level' => 11],
            ['name' => 'Grade 11 Ohm', 'grade_level' => 11],
            ['name' => 'Grade 12 Ampere', 'grade_level' => 12],
            ['name' => 'Grade 12 Watt', 'grade_level' => 12],
        ])->mapWithKeys(fn (array $row): array => [$row['name'] => Section::create($row)]);

        $competencies = $this->seedCompetencies();
        $ampere = $sections['Grade 12 Ampere'];

        User::create([
            'name' => 'Bautista, Rolando',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
            'last_active_at' => now()->subHours(2),
        ]);

        $villamor = User::create([
            'name' => 'Villamor, Maricel',
            'username' => 'mvillamor',
            'password' => Hash::make('password'),
            'role' => User::ROLE_INSTRUCTOR,
            'status' => User::STATUS_ACTIVE,
            'section_id' => $ampere->id,
            'last_active_at' => now()->subMinutes(20),
        ]);

        $delosReyes = User::create([
            'name' => 'Delos Reyes, Arnel',
            'username' => 'adelosreyes',
            'password' => Hash::make('password'),
            'role' => User::ROLE_INSTRUCTOR,
            'status' => User::STATUS_ACTIVE,
            'section_id' => $sections['Grade 12 Watt']->id,
            'last_active_at' => now()->subDay(),
        ]);

        $jhonrey = User::create([
            'name' => 'Dela Cruz, Jhon Rey',
            'username' => 'jhonrey.m',
            'password' => Hash::make('password'),
            'role' => User::ROLE_STUDENT,
            'status' => User::STATUS_ACTIVE,
            'lrn' => '136481200145',
            'section_id' => $ampere->id,
            'last_active_at' => now()->subHours(1),
        ]);

        $kimryan = User::create([
            'name' => 'Ancheta, Kim Ryan',
            'username' => 'kimryan.a',
            'password' => Hash::make('password'),
            'role' => User::ROLE_STUDENT,
            'status' => User::STATUS_LOCKED,
            'lrn' => '136481200099',
            'section_id' => $ampere->id,
            'last_active_at' => now()->subDays(14),
        ]);

        User::factory()->pending()->create([
            'name' => 'Reyes, Christine Joy',
            'username' => 'christine.r',
            'section_id' => $ampere->id,
            'last_active_at' => null,
        ]);

        $classmates = User::factory()
            ->count(28)
            ->state(['section_id' => $ampere->id, 'role' => User::ROLE_STUDENT, 'status' => User::STATUS_ACTIVE])
            ->create();

        User::factory()
            ->count(20)
            ->state(fn (): array => ['section_id' => $sections->except('Grade 12 Ampere')->random()->id])
            ->create();

        $this->seedModulePages($competencies);

        $this->seedProgress($jhonrey, $competencies, 0.55, 0.75);
        // A realistic class spread: a strong third, a middling third, a struggling rest.
        $classmates->each(function (User $student, int $i) use ($competencies): void {
            [$low, $high] = match (true) {
                $i < 12 => [0.50, 0.92],
                $i < 22 => [0.25, 0.58],
                default => [0.00, 0.15],
            };
            $this->seedProgress($student, $competencies, $low, $high);
        });

        $quizzes = $this->seedQuizzes($competencies, $ampere, $villamor);
        $this->seedAttempts($quizzes, $classmates->take(22)->push($jhonrey));
        $this->seedMessages($villamor, $jhonrey, $classmates->slice(22, 3));
        $this->seedSimulationAttempts($classmates->take(14)->push($jhonrey));

        Announcement::create([
            'section_id' => $ampere->id,
            'author_id' => $villamor->id,
            'body' => 'Bring your own soldering lead on Thursday. Practical starts 1 PM sa shop, hindi na tayo maghihintay ng late.',
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ]);
        Announcement::create([
            'section_id' => $ampere->id,
            'author_id' => $delosReyes->id,
            'body' => 'Module 4 job sheet is open na. You can read it offline before Monday.',
            'created_at' => now()->subDays(6),
            'updated_at' => now()->subDays(6),
        ]);

        $queueStudents = $classmates->take(6)->push($jhonrey);
        foreach ($queueStudents as $index => $student) {
            JobSheetSubmission::create([
                'user_id' => $student->id,
                'section_id' => $ampere->id,
                'label' => 'Job sheet 3.'.(($index % 2) + 1).', '.($index % 2 === 0
                    ? 'solder 12 resistors on the trainer board'
                    : 'identify components on a PCB'),
                'status' => JobSheetSubmission::STATUS_PENDING,
                'submitted_at' => now()->subDays(6 - $index)->setTime(8, 3),
            ]);
        }

        JobSheetSubmission::create([
            'user_id' => $jhonrey->id,
            'section_id' => $ampere->id,
            'reviewed_by' => $villamor->id,
            'label' => 'Job sheet 2.3, sketch the circuit from the spec',
            'status' => JobSheetSubmission::STATUS_ACHIEVED,
            'submitted_at' => now()->subDays(9),
            'reviewed_at' => now()->subDays(8),
        ]);

        $this->seedActivityLog($villamor, $delosReyes);
        $this->seedFailedLogins($kimryan);
    }

    /**
     * @return Collection<string, Competency>
     */
    protected function seedCompetencies(): Collection
    {
        // Codes and titles follow the unit list on p.1 of the TESDA Training
        // Regulations for EPAS NC II. ELC724335 is a core unit; the rest are
        // common units. ELC724205's own standard page (p.32) prints the code as
        // "ELC724xxx"; p.1 is the authoritative listing.
        $blueprint = [
            ['ELC724335', 'Assemble electronic products', 'Assemble electronic products', 'core', 1, [
                'Prepare the unit and workplace', 'Read the assembly drawing', 'Mount and solder components',
                'Test the assembled board', 'Rework and repair defects', 'Final inspection and packing',
            ]],
            ['ELC311202', 'Prepare and interpret technical drawing', 'Prepare and interpret technical drawing', 'common', 2, [
                'Schematic symbols', 'Block and wiring diagrams', 'Sketch a circuit from a spec', 'Bill of materials',
            ]],
            ['ELC724201', 'Use hand tools', 'Use hand tools', 'common', 3, [
                'Prepare hand tools', 'Soldering iron and desoldering pump', 'Maintain hand tools',
            ]],
            ['ELC724202', 'Terminate and connect electrical wiring and electronic circuits', 'Terminate and connect wiring', 'common', 4, [
                'Strip and splice conductors', 'Crimp and solder terminals', 'Check joints for cold solder and shorts',
                'Route and dress the harness', 'Power-up and continuity test',
            ]],
            // Module titles trace to the unit's required knowledge, TR 2.4.4,
            // 2.4.6 and 2.4.9. Module 1 carries the 3D resistor lab.
            ['ELC724205', 'Test electronic components', 'Test electronic components', 'common', 5, [
                'Describe resistance and identify resistors', 'Measure resistance using a VOM',
                'Analyze simple circuits using Ohm\'s and power law',
            ]],
        ];

        return collect($blueprint)->mapWithKeys(function (array $row): array {
            [$code, $title, $shortTitle, $kind, $sort, $modules] = $row;

            $competency = Competency::create([
                'code' => $code,
                'title' => $title,
                'short_title' => $shortTitle,
                'summary' => ucfirst($kind).' unit of the EPAS NC II qualification.',
                'sort' => $sort,
            ]);

            foreach ($modules as $index => $moduleTitle) {
                Module::create([
                    'competency_id' => $competency->id,
                    'number' => $index + 1,
                    'title' => $moduleTitle,
                    'page_count' => [9, 10, 13, 11, 12, 10][$index] ?? 10,
                ]);
            }

            return [$code => $competency->load('modules')];
        });
    }

    /**
     * @param  Collection<string, Competency>  $competencies
     */
    protected function seedProgress(User $student, Collection $competencies, float $low, float $high): void
    {
        $active = $high > 0.3;

        foreach ($competencies as $competency) {
            $modules = $competency->modules;
            $doneCount = (int) floor($modules->count() * fake()->randomFloat(2, $low, $high));

            foreach ($modules as $i => $module) {
                if ($i < $doneCount) {
                    $status = ModuleProgress::STATUS_DONE;
                    $page = $module->page_count;
                } elseif ($i === $doneCount && fake()->boolean(70)) {
                    $status = ModuleProgress::STATUS_IN_PROGRESS;
                    $page = fake()->numberBetween(1, max(1, $module->page_count - 1));
                } else {
                    continue;
                }

                ModuleProgress::create([
                    'user_id' => $student->id,
                    'module_id' => $module->id,
                    'status' => $status,
                    'current_page' => $page,
                    'updated_at' => $active
                        ? now()->subDays(fake()->numberBetween(0, 6))
                        : now()->subDays(fake()->numberBetween(9, 22)),
                ]);
            }
        }
    }

    /**
     * @param  Collection<string, Competency>  $competencies
     */
    protected function seedModulePages(Collection $competencies): void
    {
        $bodies = [
            'Set the workplace before touching any component. Clear the bench, ground the mat, and lay out the tools you will use in the order the job sheet lists them.',
            'Check each part against the bill of materials. A missing or wrong-value part found now costs a minute; found after soldering it costs an hour.',
            'Read the reference designators on the silkscreen. R for resistors, C for capacitors, U for ICs, Q for transistors. The number tells you which one.',
            'Bend the leads to match the hole spacing before you insert. Forcing a lead widens the hole and lifts the pad.',
            'Heat the pad and the lead together for about two seconds, then feed the solder. The joint should look like a small shiny cone, not a ball.',
            'A dull, cracked, or spiky joint is a cold joint. Reflow it with a little fresh solder and flux.',
            'Trim the excess lead flush with the top of the joint. Long leads short against the next row when the board flexes.',
            'Inspect under a light at an angle. Look for bridges between pins, lifted pads, and missed joints.',
            'Power up on a current-limited supply first. If the current jumps, cut power and look for a short before anything gets hot.',
            'Log what you did and what you found. The next person to service this board reads your notes first.',
            'Store the finished board in an anti-static bag. Bare boards on a wooden bench pick up charge that kills CMOS inputs.',
            'Clean the flux residue with isopropyl alcohol and a brush. Leftover flux is mildly conductive and traps moisture.',
            'Final check: every part seated, every joint bright, no debris, and the board matches the assembly drawing.',
        ];

        $competencies->each(function (Competency $competency) use ($bodies): void {
            $competency->modules->take(3)->each(function (Module $module) use ($bodies, $competency): void {
                if ($competency->code === 'ELC724205' && $module->number === 1) {
                    $this->seedResistorModule($module);

                    return;
                }

                foreach (range(1, $module->page_count) as $number) {
                    ModulePage::create([
                        'module_id' => $module->id,
                        'number' => $number,
                        'heading' => "Page {$number}: ".Str::of($bodies[($number - 1) % count($bodies)])->before('.')->toString(),
                        'body' => $bodies[($number - 1) % count($bodies)].' '.$bodies[$number % count($bodies)],
                    ]);
                }

                if ($competency->code === 'ELC724202' && $module->number === 1) {
                    $this->seedCircuitPage($module);
                }
            });
        });
    }

    /**
     * ELC724205, Module 1. Written content that leads into the resistor lab;
     * headings follow the unit's required knowledge (TR 2.4.4, 2.4.6, 2.4.7, 2.4.9).
     */
    protected function seedResistorModule(Module $module): void
    {
        $pages = [
            ['text', null, 'What a resistor does',
                'A resistor limits how much current flows in a circuit. Its resistance is measured in ohms (Ω). The parts you will handle most are 1/4 W carbon-film resistors: a small tan body about 6 mm long with a wire lead at each end. They have no polarity, so either lead can go either way on the board. The value is not printed as numbers; it is painted on the body as coloured bands.'],
            ['text', null, 'Reading the four-band colour code',
                'Hold the resistor so the tolerance band (usually gold or silver, set a little apart) is on your right. Read left to right: band 1 is the first digit, band 2 the second digit, band 3 the multiplier, band 4 the tolerance. Black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9. Brown, black, red, gold reads 1, 0, ×100, ±5%: 1 000 Ω, written 1 kΩ ±5%.'],
            ['text', null, 'Tolerance and checking with the multimeter',
                'No resistor is exactly its printed value. A 1 kΩ ±5% part may read anywhere from 950 Ω to 1 050 Ω and still be good. To test one, take it out of the circuit or switch the power off, set the digital multimeter to the ohms range just above the value, and touch one probe to each lead without holding both leads in your fingers. Compare the reading with the tolerance range: inside the range, the part passes; outside it, record it as faulty.'],
            ['simulation', ResistorLab::KEY, 'Resistor lab: read, measure, calculate',
                'Turn the resistor, change its bands, and check it with the multimeter. The checkpoints at the end are recorded on your dashboard, and your instructor sees your best result.'],
            ['text', null, 'Ohm\'s law at the bench',
                'Voltage, current and resistance are tied together: V = I × R. A 9 V battery across a 330 Ω resistor drives I = 9 ÷ 330 ≈ 0.0273 A, which the meter shows as 27.3 mA. The resistor turns that energy into heat, P = I² × R ≈ 0.245 W, just under the 0.25 W a 1/4 W part is rated for. Write every reading in your job sheet with its unit and prefix; the next person to test the board reads your notes first.'],
        ];

        foreach ($pages as $index => [$type, $key, $heading, $body]) {
            ModulePage::create([
                'module_id' => $module->id,
                'number' => $index + 1,
                'type' => $type,
                'simulation_key' => $key,
                'heading' => $heading,
                'body' => $body,
            ]);
        }

        $module->update(['page_count' => count($pages)]);
    }

    /**
     * ELC724202, Module 1. The last page becomes the open circuit workbench:
     * wiring a circuit, testing the connections, finding a bad one.
     */
    protected function seedCircuitPage(Module $module): void
    {
        ModulePage::query()
            ->where('module_id', $module->id)
            ->where('number', $module->page_count)
            ->update([
                'type' => ModulePage::TYPE_SIMULATION,
                'simulation_key' => CircuitSandbox::KEY,
                'heading' => 'Circuit workbench: wire it, measure it, fix it',
                'body' => 'Build a circuit from a battery, resistors, an LED and a switch, then check it with the multimeter. Free build is for experimenting; the five challenges are graded by the server and recorded on your dashboard.',
            ]);
    }

    /**
     * A spread of lab attempts so both dashboards have something to show.
     *
     * @param  Collection<int, User>  $students
     */
    protected function seedSimulationAttempts(Collection $students): void
    {
        $page = ModulePage::query()->where('simulation_key', ResistorLab::KEY)->first();

        foreach ($students as $student) {
            foreach (range(1, fake()->numberBetween(1, 2)) as $try) {
                $score = min(5, fake()->numberBetween(2, 5) + ($try - 1));

                SimulationAttempt::create([
                    'user_id' => $student->id,
                    'simulation_key' => ResistorLab::KEY,
                    'module_page_id' => $page?->id,
                    'score' => $score,
                    'max_score' => 5,
                    'payload' => ['seeded' => true],
                    'completed_at' => now()->subDays(fake()->numberBetween(0, 9))->subMinutes(fake()->numberBetween(0, 600)),
                ]);
            }
        }
    }

    /**
     * @param  Collection<string, Competency>  $competencies
     * @return Collection<int, Quiz>
     */
    protected function seedQuizzes(Collection $competencies, Section $section, User $author): Collection
    {
        $blueprint = [
            ['ELC724335', 'Self-check 3.1, soldering defects', true, [
                ['A joint looks dull, grainy, and cracked around the lead. What is it?', ['A good joint', 'A cold solder joint', 'A solder bridge', 'An overheated pad'], 1],
                ['The safe way to fix a cold joint is to', ['scrape it with a knife', 'add more solder without heat', 'reheat it with flux and a little fresh solder', 'ignore it if the board works'], 2],
                ['Two adjacent pins are connected by a blob of solder. This is a', ['fillet', 'via', 'solder bridge', 'wetting line'], 2],
                ['A lifted pad is usually caused by', ['too little solder', 'holding the iron on the pad too long', 'using flux', 'cutting the lead too short'], 1],
                ['The tip of a soldering iron should be', ['dry and clean', 'tinned with a thin coat of solder', 'filed to a point every use', 'as hot as it will go'], 1],
            ]],
            ['ELC311202', 'Self-check 2.2, reading the drawing', true, [
                ['On a schematic, a dashed rectangle around several parts usually means', ['they are optional', 'they share one package or shield', 'they are not populated', 'they are test points'], 1],
                ['A line that crosses another with a small hop or gap means the wires', ['are connected', 'are not connected', 'are the same net', 'carry AC'], 1],
                ['The reference designator "U3" points to', ['the third resistor', 'the third integrated circuit', 'a test point', 'a jumper'], 1],
                ['A zig-zag symbol on a schematic is a', ['capacitor', 'resistor', 'diode', 'switch'], 1],
                ['Pin 1 of an IC on the PCB is marked by', ['the longest lead', 'a dot or notch on the package', 'the red wire', 'nothing, it does not matter'], 1],
            ]],
            ['ELC724205', 'Self-check 1.1, using the multimeter', true, [
                ['To check if a wire is broken, set the multimeter to', ['DC volts', 'AC volts', 'continuity', 'the 10 A current jack'], 2],
                ['Before measuring resistance in a circuit, you must', ['turn the power on', 'remove power and discharge capacitors', 'set it to AC', 'touch both probes together'], 1],
                ['The black probe goes in the jack marked', ['10A', 'VΩmA', 'COM', 'TEMP'], 2],
                ['A reading of "1" or "OL" on the ohms range means', ['zero ohms', 'a short', 'over-range or open', 'the battery is low'], 2],
                ['Measuring current means the meter is connected', ['across the load', 'in series with the load', 'to earth', 'to the case'], 1],
            ]],
            ['ELC724202', 'Draft, terminate and connect wiring', false, [
                ['A cold-formed crimp is inspected by', ['pulling on the wire gently', 'looking at the colour', 'smell', 'weight'], 0],
            ]],
        ];

        return collect($blueprint)->map(function (array $row) use ($competencies, $section, $author): Quiz {
            [$code, $title, $published, $items] = $row;

            $quiz = Quiz::create([
                'competency_id' => $competencies[$code]->id,
                'author_id' => $author->id,
                'title' => $title,
                'reference' => 'CBLM '.Str::after($title, 'Self-check '),
                'pass_mark' => 75,
                'max_attempts' => 3,
                'is_published' => $published,
            ]);

            if ($published) {
                $quiz->sections()->attach($section->id);
            }

            foreach ($items as $number => $item) {
                [$stem, $choices, $correct] = $item;
                $quiz->items()->create([
                    'number' => $number + 1,
                    'stem' => $stem,
                    'choices' => $choices,
                    'correct_index' => $correct,
                    'rationale' => 'Review the information sheet for this competency.',
                ]);
            }

            return $quiz->load('items');
        });
    }

    /**
     * @param  Collection<int, Quiz>  $quizzes
     * @param  Collection<int, User>  $students
     */
    protected function seedAttempts(Collection $quizzes, Collection $students): void
    {
        $published = $quizzes->where('is_published', true);

        foreach ($students as $student) {
            foreach ($published->random(fake()->numberBetween(1, $published->count())) as $quiz) {
                $attemptCount = fake()->numberBetween(1, 2);

                for ($attempt = 1; $attempt <= $attemptCount; $attempt++) {
                    $answers = [];
                    $correct = 0;
                    $skill = fake()->randomFloat(2, 0.4, 0.95) + ($attempt - 1) * 0.1;

                    foreach ($quiz->items as $item) {
                        if (fake()->boolean((int) min($skill * 100, 96))) {
                            $answers[(string) $item->id] = $item->correct_index;
                            $correct++;
                        } else {
                            $answers[(string) $item->id] = fake()->numberBetween(0, 3);
                        }
                    }

                    $total = $quiz->items->count();
                    $percent = (int) round($correct / max($total, 1) * 100);

                    QuizScore::create([
                        'user_id' => $student->id,
                        'competency_id' => $quiz->competency_id,
                        'quiz_id' => $quiz->id,
                        'title' => $quiz->title,
                        'score' => $correct,
                        'total' => $total,
                        'answers' => $answers,
                        'attempt_number' => $attempt,
                        'status' => $percent >= $quiz->pass_mark ? QuizScore::STATUS_PASSED : QuizScore::STATUS_RETAKE,
                        'taken_on' => now()->subDays(fake()->numberBetween(1, 24)),
                    ]);
                }
            }
        }
    }

    /**
     * @param  Collection<int, User>  $strugglers
     */
    protected function seedMessages(User $instructor, User $jhonrey, Collection $strugglers): void
    {
        Message::create([
            'sender_id' => $instructor->id,
            'recipient_id' => $jhonrey->id,
            'subject' => 'A note from your instructor',
            'body' => 'Good work on Self-check 3.1. Finish Module 3 this week so we can schedule your sign-off for the practical.',
            'created_at' => now()->subDays(1),
            'updated_at' => now()->subDays(1),
        ]);

        foreach ($strugglers as $student) {
            Message::create([
                'sender_id' => $instructor->id,
                'recipient_id' => $student->id,
                'subject' => 'A note from your instructor',
                'body' => 'I noticed you have not opened a module in a while. Come see me sa shop tomorrow, dadaan tayo sa mga natira mong pages together.',
                'created_at' => now()->subDays(fake()->numberBetween(1, 4)),
                'updated_at' => now()->subDays(fake()->numberBetween(1, 4)),
            ]);
        }
    }

    protected function seedActivityLog(User $villamor, User $delosReyes): void
    {
        $rows = [
            [ActivityLog::CATEGORY_CONTENT, 'Published Module 4, Test the assembled board', "{$villamor->name}, instructor", 'Laptop, lab 2', now()->setTime(10, 42)],
            [ActivityLog::CATEGORY_SIGN_IN, '41 students signed in within four minutes', 'Grade 12 Ampere, practical class', 'Android phones', now()->setTime(10, 20)],
            [ActivityLog::CATEGORY_ACCOUNT, 'Approved 3 new student accounts', 'Bautista, Rolando, admin', 'Laptop, office', now()->setTime(9, 58)],
            [ActivityLog::CATEGORY_CONTENT, 'Edited Self-check 2.2, replaced item 7', "{$delosReyes->name}, instructor", 'Laptop, lab 1', now()->setTime(9, 31)],
            [ActivityLog::CATEGORY_SIGN_IN, 'Failed sign-in, 5th try in a row', 'kimryan.a', 'Android phone', now()->setTime(8, 47)],
            [ActivityLog::CATEGORY_ACCOUNT, 'Reset password for galvez.l', 'Bautista, Rolando, admin', 'Laptop, office', now()->setTime(7, 15)],
            [ActivityLog::CATEGORY_SYSTEM, 'Nightly backup finished, 42 seconds', 'System', 'School server', now()->setTime(6, 2)],
        ];

        foreach ($rows as [$category, $description, $actor, $device, $occurredAt]) {
            ActivityLog::create([
                'category' => $category,
                'description' => $description,
                'actor' => $actor,
                'device' => $device,
                'occurred_at' => $occurredAt,
            ]);
        }
    }

    protected function seedFailedLogins(User $kimryan): void
    {
        for ($i = 0; $i < 9; $i++) {
            LoginAttempt::create([
                'username' => $kimryan->username,
                'ip_address' => '10.0.14.'.fake()->numberBetween(2, 60),
                'successful' => false,
                'attempted_at' => now()->subMinutes($i * 37),
            ]);
        }

        LoginAttempt::create([
            'username' => 'jhonrey.m',
            'ip_address' => '10.0.14.5',
            'successful' => true,
            'attempted_at' => now()->subHours(1),
        ]);
    }
}
