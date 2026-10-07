<?php

namespace Tests\Unit;

use App\Simulations\Circuit\CircuitDocument;
use App\Simulations\Circuit\Solver;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The server-side solver must solve every circuit exactly as the browser does.
 * Both run against tests/fixtures/circuit-vectors.json, whose values are worked
 * from closed-form circuit formulas; the TypeScript side is `npm run check:circuit`.
 */
class CircuitSolverTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function vectors(): array
    {
        return json_decode((string) file_get_contents(__DIR__.'/../fixtures/circuit-vectors.json'), true);
    }

    private function close(float $actual, float $wanted, array $tol): bool
    {
        return abs($actual - $wanted) <= max($tol['abs'], abs($wanted) * $tol['rel']);
    }

    public function test_every_shared_vector_solves_as_worked_by_hand(): void
    {
        $vectors = $this->vectors();

        foreach ($vectors['cases'] as $case) {
            $tol = $case['tolerance'] ?? $vectors['tolerance'];
            $parsed = CircuitDocument::parse($case['doc']);
            $this->assertArrayHasKey('doc', $parsed, $case['name'].': '.($parsed['error'] ?? ''));
            $result = Solver::solve($parsed['doc']);

            foreach ($case['expect']['elements'] ?? [] as $id => $wanted) {
                $this->assertArrayHasKey($id, $result['elements'], "{$case['name']}: no result for {$id}");
                foreach (['v', 'i', 'p'] as $key) {
                    if (isset($wanted[$key])) {
                        $this->assertTrue(
                            $this->close($result['elements'][$id][$key], $wanted[$key], $tol),
                            "{$case['name']}: {$id}.{$key} = {$result['elements'][$id][$key]}, expected {$wanted[$key]}",
                        );
                    }
                }
            }

            foreach ($case['expect']['meters'] ?? [] as $id => $wanted) {
                $this->assertArrayHasKey($id, $result['meters'], "{$case['name']}: no reading for {$id}");
                $got = $result['meters'][$id];
                if (array_key_exists('value', $wanted)) {
                    if ($wanted['value'] === null) {
                        $this->assertNull($got['value'], "{$case['name']}: {$id} should have no reading");
                    } else {
                        $this->assertNotNull($got['value'], "{$case['name']}: {$id} has no reading");
                        $this->assertTrue($this->close($got['value'], $wanted['value'], $tol), "{$case['name']}: {$id} reads {$got['value']}, expected {$wanted['value']}");
                    }
                }
                if (isset($wanted['fault'])) {
                    $this->assertSame($wanted['fault'], $got['fault'] ?? null, "{$case['name']}: {$id} fault");
                }
                if (isset($wanted['beep'])) {
                    $this->assertSame($wanted['beep'], $got['beep'] ?? null, "{$case['name']}: {$id} beep");
                }
            }

            $key = fn (array $f): string => $f['part'].':'.$f['kind'];
            $got = array_map($key, $result['flags']);
            $wantedFlags = array_map($key, $case['expect']['flags']);
            sort($got);
            sort($wantedFlags);
            $this->assertSame($wantedFlags, $got, "{$case['name']}: flags");
        }
    }

    public function test_resistance_between_two_pins(): void
    {
        $parsed = CircuitDocument::parse([
            'parts' => [
                ['id' => 'R1', 'type' => 'resistor', 'value' => 330],
                ['id' => 'R2', 'type' => 'resistor', 'value' => 470],
            ],
            'wires' => [['id' => 'w1', 'from' => ['part' => 'R1', 'pin' => 'b'], 'to' => ['part' => 'R2', 'pin' => 'a']]],
        ]);

        $this->assertTrue($this->close(Solver::resistanceBetween($parsed['doc'], 'R1.a', 'R2.b'), 800.0, ['rel' => 1e-5, 'abs' => 1e-9]));
        $this->assertSame(INF, Solver::resistanceBetween($parsed['doc'], 'R1.a', 'Nope.x'));
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function badDocuments(): array
    {
        $r = fn (string $id, float $value = 100): array => ['id' => $id, 'type' => 'resistor', 'value' => $value];

        return [
            'not an object' => [5],
            'unknown part type' => [['parts' => [['id' => 'X1', 'type' => 'transistor']], 'wires' => []]],
            'duplicate part name' => [['parts' => [$r('R1'), $r('R1')], 'wires' => []]],
            'resistor of 0 ohm' => [['parts' => [$r('R1', 0)], 'wires' => []]],
            'supply of 40 V' => [['parts' => [['id' => 'V1', 'type' => 'supply', 'value' => 40]], 'wires' => []]],
            'LED with no colour' => [['parts' => [['id' => 'D1', 'type' => 'led']], 'wires' => []]],
            'wire to a missing part' => [['parts' => [$r('R1')], 'wires' => [['id' => 'w1', 'from' => ['part' => 'R1', 'pin' => 'a'], 'to' => ['part' => 'R9', 'pin' => 'a']]]]],
            'wire to a missing pin' => [['parts' => [$r('R1')], 'wires' => [['id' => 'w1', 'from' => ['part' => 'R1', 'pin' => 'a'], 'to' => ['part' => 'R1', 'pin' => 'z']]]]],
            'wire from a pin to itself' => [['parts' => [$r('R1')], 'wires' => [['id' => 'w1', 'from' => ['part' => 'R1', 'pin' => 'a'], 'to' => ['part' => 'R1', 'pin' => 'a']]]]],
            'bad part name' => [['parts' => [['id' => '1; DROP', 'type' => 'junction']], 'wires' => []]],
            'too many parts' => [['parts' => array_map(fn (int $i): array => ['id' => "J{$i}", 'type' => 'junction'], range(0, 40)), 'wires' => []]],
            'string where a number belongs' => [['parts' => [['id' => 'R1', 'type' => 'resistor', 'value' => '330']], 'wires' => []]],
            'switch with a text state' => [['parts' => [['id' => 'S1', 'type' => 'switch', 'closed' => 'yes']], 'wires' => []]],
        ];
    }

    #[DataProvider('badDocuments')]
    public function test_the_document_parser_rejects_what_the_browser_parser_rejects(mixed $document): void
    {
        $this->assertArrayHasKey('error', CircuitDocument::parse($document));
    }
}
