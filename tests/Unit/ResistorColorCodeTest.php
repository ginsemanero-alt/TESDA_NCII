<?php

namespace Tests\Unit;

use App\Simulations\Resistor\ColorCode;
use App\Simulations\Resistor\ResistorLab;
use PHPUnit\Framework\TestCase;

/**
 * The server-side grader must compute exactly what the browser lab computes.
 * Both run against tests/fixtures/resistor-vectors.json; the TypeScript side
 * is `npm run check:resistor`.
 */
class ResistorColorCodeTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function vectors(): array
    {
        return json_decode((string) file_get_contents(__DIR__.'/../fixtures/resistor-vectors.json'), true);
    }

    public function test_band_sets_read_as_the_shared_vectors(): void
    {
        foreach ($this->vectors()['bands'] as $vector) {
            $value = ColorCode::read($vector['bands']);
            $label = implode('-', $vector['bands']);

            $this->assertTrue(ColorCode::near($value['ohms'], $vector['ohms'], 1e-9), "{$label} ohms");
            $this->assertEqualsWithDelta($vector['tolerance'], $value['tolerance'], 1e-12, "{$label} tolerance");
            $this->assertTrue(ColorCode::near($value['min'], $vector['min'], 1e-9), "{$label} min");
            $this->assertTrue(ColorCode::near($value['max'], $vector['max'], 1e-9), "{$label} max");
        }
    }

    public function test_allowed_colours_per_band_match(): void
    {
        foreach ($this->vectors()['allowed'] as $position => $colors) {
            $this->assertSame($colors, ColorCode::allowed((int) $position), "band {$position}");
        }
    }

    public function test_ohms_law_and_power_match(): void
    {
        foreach ($this->vectors()['current'] as $vector) {
            $this->assertTrue(ColorCode::near(ColorCode::current($vector['volts'], $vector['ohms']), $vector['amps'], 1e-12));
        }
        foreach ($this->vectors()['power'] as $vector) {
            $this->assertTrue(ColorCode::near(ColorCode::power($vector['amps'], $vector['ohms']), $vector['watts'], 1e-12));
        }
    }

    public function test_band_set_validation(): void
    {
        $this->assertTrue(ColorCode::isValidBandSet(['brown', 'black', 'red', 'gold']));
        $this->assertFalse(ColorCode::isValidBandSet(['black', 'black', 'red', 'gold']), 'first digit cannot be zero');
        $this->assertFalse(ColorCode::isValidBandSet(['brown', 'gold', 'red', 'gold']), 'gold is not a digit');
        $this->assertFalse(ColorCode::isValidBandSet(['brown', 'black', 'red', 'orange']), 'orange is not a tolerance');
        $this->assertFalse(ColorCode::isValidBandSet(['brown', 'black', 'red']));
        $this->assertFalse(ColorCode::isValidBandSet('brown,black,red,gold'));
    }

    public function test_generated_checkpoints_are_always_answerable(): void
    {
        $lab = new ResistorLab;

        for ($i = 0; $i < 200; $i++) {
            $checkpoints = $lab->checkpoints();
            $this->assertCount(5, $checkpoints);

            foreach ($checkpoints as $checkpoint) {
                if (isset($checkpoint['bands'])) {
                    $this->assertTrue(ColorCode::isValidBandSet($checkpoint['bands']));
                }
                if ($checkpoint['type'] === 'tolerance') {
                    $value = ColorCode::read($checkpoint['bands']);
                    // Never ambiguous: at least 20% of the tolerance from the edge.
                    $spread = $value['ohms'] * $value['tolerance'] / 100;
                    $distance = min(abs($checkpoint['measured'] - $value['min']), abs($checkpoint['measured'] - $value['max']));
                    $this->assertGreaterThan($spread * 0.05, $distance, json_encode($checkpoint));
                }
            }
        }
    }
}
