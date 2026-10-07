<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SignInPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_sign_in_route_is_named_and_responds(): void
    {
        $response = $this->get(route('sign-in'));

        $response->assertOk();
    }

    public function test_it_renders_both_the_sign_in_and_create_account_forms(): void
    {
        $response = $this->get('/sign-in');

        $response->assertOk();
        $response->assertSee('Sign in to pick up where you stopped.');
        $response->assertSee('Create account');
        $response->assertSee('Username');
        $response->assertSee('LRN');
        $response->assertSee('Section');
    }

    public function test_it_does_not_include_the_design_only_mockup_state_chips(): void
    {
        $response = $this->get('/sign-in');

        $response->assertDontSee('Mockup states, for the demo');
    }

    public function test_the_landing_page_links_to_the_sign_in_route(): void
    {
        $response = $this->get('/');

        $response->assertSee(route('sign-in'), false);
    }
}
