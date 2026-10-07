<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The page asks Vite for the hero entry when the build exists; tests don't need it.
        $this->withoutVite();
    }

    public function test_the_landing_route_is_named_and_responds(): void
    {
        $response = $this->get(route('landing'));

        $response->assertOk();
    }

    public function test_it_renders_the_epas_landing_content(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('EPAS NC II');
        $response->assertSee('Learn to assemble and service electronic products, one competency at a time.');
        $response->assertSee('What you do in here, every module');
        $response->assertSee('Rizal National High School');
    }

    public function test_it_lists_the_competency_units_with_their_tr_codes(): void
    {
        $response = $this->get('/');

        // Codes as listed on p.1 of the TESDA Training Regulations for EPAS NC II.
        $response->assertSee('ELC724335');
        $response->assertSee('ELC311202');
        $response->assertSee('ELC724201');
        $response->assertSee('ELC724202');
        $response->assertSee('ELC724205');

        // The codes the page used before the correction do not exist in the TR.
        $response->assertDontSee('ELC724331');
        $response->assertDontSee('ELC724333');
        $response->assertDontSee('ELC724334');
    }

    public function test_it_no_longer_serves_the_default_laravel_welcome_page(): void
    {
        $response = $this->get('/');

        $response->assertDontSee('Laravel has an incredibly rich ecosystem');
    }

    public function test_the_hero_has_the_stage_the_copy_beats_and_a_static_fallback(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        // Starts static: no script has chosen 3D, and the page reads fine without any.
        $response->assertSee('id="epas-hero"', false);
        $response->assertSee('data-hero-mode="static"', false);
        // The mount point for the live 3D hero, with the self-hosted asset base.
        $response->assertSee('id="epas-hero-stage"', false);
        $response->assertSee(asset('simulations/resistor'), false);
        // The scroll beats the camera follows: intro, four bands, measure, circuit.
        $response->assertSee('data-hero-beat="intro"', false);
        foreach ([0, 1, 2, 3] as $step) {
            $response->assertSee('data-hero-beat="colorcode" data-step="'.$step.'"', false);
        }
        $response->assertSee('data-hero-beat="measure"', false);
        $response->assertSee('data-hero-beat="circuit"', false);
        // The static fallback (phones, weak PCs, no WebGL, no JavaScript).
        $response->assertSee('Circuit board diagram with a 10 kilohm resistor', false);
        $response->assertSee('data-hero-toggle', false);
    }

    public function test_the_header_and_hero_send_visitors_to_sign_in(): void
    {
        $response = $this->get('/');

        $response->assertSee('Try the lab');
        $response->assertSee('>Sign in</a>', false);

        // Header (Try the lab, Sign in), hero, last beat (two) and the closing call to action.
        $this->assertGreaterThanOrEqual(6, substr_count($response->getContent(), 'href="'.route('sign-in').'"'));
    }

    public function test_the_public_hero_records_nothing_and_has_no_checkpoints(): void
    {
        $response = $this->get('/');

        // Scores, checkpoints and progress stay behind login: the page carries no
        // attempt endpoint, no questions and no lab island.
        $response->assertDontSee('data-simulation-island', false);
        $response->assertDontSee('data-checkpoints', false);
        $response->assertDontSee('/attempts', false);
        $response->assertDontSee('csrf-token', false);
    }

    public function test_the_hero_markup_is_only_on_the_landing_page(): void
    {
        $this->get(route('sign-in'))->assertOk()->assertDontSee('epas-hero', false);
    }
}
