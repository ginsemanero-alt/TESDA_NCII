<?php

namespace Tests\Feature;

use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminAccountsAndBackupTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_accounts_page_paginates_and_filters_by_role(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(3)->create(['role' => User::ROLE_STUDENT]);
        $instructor = User::factory()->instructor()->create(['name' => 'Villamor, Maricel']);

        $this->actingAs($admin)->get(route('admin.accounts.index', ['role' => 'instructor']))
            ->assertOk()
            ->assertSee('Villamor, Maricel')
            ->assertSee($instructor->username);
    }

    public function test_an_admin_can_create_a_student_account_with_a_temporary_password(): void
    {
        $admin = User::factory()->admin()->create();
        $section = Section::factory()->create();

        $this->actingAs($admin)->post(route('admin.accounts.store'), [
            'name' => 'Santos, Maria',
            'username' => 'maria.s',
            'role' => User::ROLE_STUDENT,
            'lrn' => '123412341234',
            'section_id' => $section->id,
        ])->assertRedirect(route('admin.accounts.index'))->assertSessionHas('notice');

        $this->assertDatabaseHas('users', [
            'username' => 'maria.s',
            'role' => User::ROLE_STUDENT,
            'status' => User::STATUS_ACTIVE,
            'section_id' => $section->id,
        ]);
    }

    public function test_creating_a_student_requires_an_lrn_and_section(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.accounts.store'), [
            'name' => 'Santos, Maria',
            'username' => 'maria.s',
            'role' => User::ROLE_STUDENT,
        ])->assertSessionHasErrors(['lrn', 'section_id']);
    }

    public function test_an_admin_can_run_a_backup_that_is_downloadable(): void
    {
        Storage::fake('local');
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.backups.store'))
            ->assertRedirect()
            ->assertSessionHas('status');

        $files = Storage::disk('local')->files('backups');
        $this->assertNotEmpty($files);

        $this->actingAs($admin)->get(route('admin.backups.download', basename($files[0])))->assertOk();
    }

    public function test_students_cannot_reach_admin_account_pages(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get(route('admin.accounts.create'))
            ->assertRedirect(route('dashboard'));
    }
}
