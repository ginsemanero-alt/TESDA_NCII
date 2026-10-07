<?php

namespace Tests\Feature;

use App\Simulations\Circuit\CircuitDocument;
use App\Simulations\Circuit\CircuitSandbox;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\SolvesCircuitChallenges;
use Tests\TestCase;

/**
 * Grades circuits the way the server does: by solving what the student built.
 * Each challenge gets a hand-made correct answer and a few wrong ones.
 */
class CircuitSandboxGradingTest extends TestCase
{
    use SolvesCircuitChallenges;

    private CircuitSandbox $lab;

    protected function setUp(): void
    {
        parent::setUp();
        $this->lab = new CircuitSandbox;
    }

    /** @return array<string, array{0: string}> */
    public static function types(): array
    {
        return array_combine(
            ['build_led', 'measure_voltage', 'measure_current', 'ohms_law', 'troubleshoot', 'parallel'],
            array_map(fn (string $t): array => [$t], ['build_led', 'measure_voltage', 'measure_current', 'ohms_law', 'troubleshoot', 'parallel']),
        );
    }

    public function test_five_different_challenges_are_issued_and_nothing_gives_the_answer_away(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $cps = $this->lab->checkpoints();
            $this->assertCount(5, $cps);
            $this->assertCount(5, array_unique(array_column($cps, 'type')));
            $this->assertSame(['c1', 'c2', 'c3', 'c4', 'c5'], array_column($cps, 'id'));
        }

        $json = json_encode($this->lab->challenge('parallel'));
        $this->assertStringNotContainsString('"r2"', $json, 'the second resistor of the parallel pair is not issued');
        for ($i = 0; $i < 10; $i++) {
            $trouble = json_encode($this->lab->challenge('troubleshoot'));
            $this->assertStringNotContainsString('variant', $trouble, 'the cause of the fault is not issued, only its symptom');
            $this->assertStringNotContainsString('"cause"', $trouble);
        }
        foreach (['build_led', 'measure_voltage', 'measure_current', 'ohms_law', 'troubleshoot', 'parallel'] as $type) {
            $this->assertStringNotContainsString('answer', json_encode($this->lab->challenge($type)));
            $this->assertStringNotContainsString('expected', json_encode($this->lab->challenge($type)));
        }
    }

    public function test_every_issued_starting_circuit_is_a_valid_document(): void
    {
        foreach (['build_led', 'measure_voltage', 'measure_current', 'troubleshoot', 'parallel'] as $type) {
            for ($i = 0; $i < 10; $i++) {
                $this->assertArrayHasKey('doc', CircuitDocument::parse($this->lab->challenge($type)['doc']), $type);
            }
        }
    }

    #[DataProvider('types')]
    public function test_a_correct_answer_is_marked_correct_for_every_challenge(string $type): void
    {
        for ($i = 0; $i < 25; $i++) {
            $cp = $this->lab->challenge($type);
            $results = $this->lab->grade([$cp], [$cp['id'] => $this->correct($cp)]);
            $this->assertSame([['id' => 'c1', 'correct' => true]], $results, $type.' '.json_encode(array_diff_key($cp, ['doc' => 1, 'options' => 1])));
        }
    }

    public function test_an_unattempted_challenge_is_wrong_not_an_error(): void
    {
        $cp = $this->lab->challenge('ohms_law');

        $this->assertSame([['id' => 'c1', 'correct' => false]], $this->lab->grade([$cp], []));
    }

    public function test_a_resistor_that_is_too_small_burns_the_led_and_fails(): void
    {
        $cp = $this->lab->challenge('build_led');
        $answer = $this->correct($cp);
        $answer['doc']['parts'] = array_map(fn (array $p): array => $p['id'] === 'R1' ? [...$p, 'value' => 10.0] : $p, $answer['doc']['parts']);

        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);
    }

    public function test_build_led_needs_a_resistor_the_issued_supply_and_no_second_source(): void
    {
        $cp = $this->lab->challenge('build_led');
        $good = $this->correct($cp);

        $noResistor = $good;
        $noResistor['doc']['parts'] = array_values(array_filter($noResistor['doc']['parts'], fn (array $p): bool => $p['type'] !== 'resistor'));
        $noResistor['doc']['wires'] = [self::wire('w1', 'V1.+', 'D1.a'), self::wire('w2', 'D1.k', 'V1.-')];
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $noResistor])[0]['correct']);

        $wrongSupply = $good;
        $wrongSupply['doc']['parts'] = array_map(fn (array $p): array => $p['id'] === 'V1' ? [...$p, 'value' => 15.0] : $p, $wrongSupply['doc']['parts']);
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $wrongSupply])[0]['correct'], 'changing the supply voltage is not allowed');

        $extraSource = $good;
        $extraSource['doc']['parts'][] = ['id' => 'B1', 'type' => 'battery', 'x' => 0, 'y' => 0, 'rot' => 0];
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $extraSource])[0]['correct']);
    }

    public function test_a_voltmeter_the_wrong_way_round_reads_negative_and_fails(): void
    {
        $cp = $this->lab->challenge('measure_voltage');
        $answer = $this->correct($cp);
        $answer['doc']['wires'] = array_map(function (array $w) use ($cp): array {
            if ($w['id'] === 'w4') {
                $w['to']['pin'] = 'b';
            }
            if ($w['id'] === 'w5') {
                $w['to']['pin'] = 'a';
            }

            return $w;
        }, $answer['doc']['wires']);

        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);
    }

    public function test_a_measured_value_that_does_not_match_the_circuit_fails(): void
    {
        $cp = $this->lab->challenge('measure_voltage');
        $answer = $this->correct($cp);
        $answer['volts'] *= 1.2;
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);

        $cp = $this->lab->challenge('measure_current');
        $answer = $this->correct($cp);
        $answer['amps'] *= 10; // a slipped prefix
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);

        $cp = $this->lab->challenge('ohms_law');
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => ['amps' => $cp['volts'] / $cp['ohms'] * 1000]])[0]['correct']);
    }

    public function test_an_ammeter_left_in_parallel_does_not_count(): void
    {
        $cp = $this->lab->challenge('measure_current');
        $answer = $this->correct($cp);
        $answer['doc']['wires'] = [
            self::wire('w1', 'B1.+', 'R1.b'),
            self::wire('w2', 'R1.a', 'R2.b'),
            self::wire('w3', 'R2.a', 'J1.j'),
            self::wire('w4', 'J1.j', 'B1.-'),
            self::wire('w5', 'M1.v', 'B1.+'),
            self::wire('w6', 'M1.com', 'B1.-'),
        ];

        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);
    }

    public function test_troubleshooting_needs_both_the_right_cause_and_a_working_repair(): void
    {
        foreach (['reversed', 'open', 'big'] as $variant) {
            do {
                $cp = $this->lab->challenge('troubleshoot');
            } while ($this->lab->causeOf($cp) !== $variant);

            $answer = $this->correct($cp);
            $this->assertTrue($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct'], $variant);

            $wrongCause = [...$answer, 'cause' => $variant === 'open' ? 'flat' : 'open'];
            $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $wrongCause])[0]['correct'], "{$variant}: right repair, wrong cause");

            $unrepaired = [...$answer, 'doc' => $cp['doc']];
            $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $unrepaired])[0]['correct'], "{$variant}: right cause, nothing repaired");
        }
    }

    public function test_the_parallel_pair_must_really_be_parallel(): void
    {
        $cp = $this->lab->challenge('parallel');
        $answer = $this->correct($cp);
        $this->assertTrue($this->lab->grade([$cp], [$cp['id'] => $answer])[0]['correct']);

        // The same two resistors in series give a different resistance.
        $series = $answer;
        $series['doc']['wires'] = [self::wire('w1', 'R1.b', 'R2.a')];
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $series])[0]['correct']);

        // A powered circuit is not a resistance measurement.
        $powered = $answer;
        $powered['doc']['parts'][] = ['id' => 'B1', 'type' => 'battery', 'x' => 0, 'y' => 0, 'rot' => 0];
        $this->assertFalse($this->lab->grade([$cp], [$cp['id'] => $powered])[0]['correct']);
    }

    public function test_malformed_answers_are_refused_not_graded(): void
    {
        $cp = $this->lab->challenge('measure_voltage');

        $this->assertNull($this->lab->grade([$cp], [$cp['id'] => 'a lot']));
        $this->assertNull($this->lab->grade([$cp], [$cp['id'] => ['doc' => 'nope', 'volts' => 1]]));
        $this->assertNull($this->lab->grade([$cp], [$cp['id'] => ['doc' => $cp['doc'], 'volts' => 'four']]));
        $this->assertNull($this->lab->grade([$cp], [$cp['id'] => ['doc' => ['parts' => [['id' => 'X1', 'type' => 'nuclear']], 'wires' => []], 'volts' => 1]]));

        $trouble = $this->lab->challenge('troubleshoot');
        $this->assertNull($this->lab->grade([$trouble], [$trouble['id'] => ['doc' => $trouble['doc'], 'cause' => 'gremlins']]));
    }
}
