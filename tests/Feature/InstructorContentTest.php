<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Models\Quiz;
use App\Models\QuizItem;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InstructorContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_instructor_can_add_a_page_to_a_module(): void
    {
        $instructor = User::factory()->instructor()->create();
        $module = Module::factory()->create(['page_count' => 0, 'competency_id' => Competency::factory()]);

        $this->actingAs($instructor)->post(route('instructor.lessons.pages.store', $module), [
            'heading' => 'Prepare the workplace',
            'body' => 'Clear the bench and ground the mat before you start.',
        ])->assertRedirect();

        $this->assertDatabaseHas('module_pages', ['module_id' => $module->id, 'number' => 1, 'heading' => 'Prepare the workplace']);
        $this->assertSame(1, $module->refresh()->page_count);
    }

    public function test_deleting_a_page_renumbers_the_rest(): void
    {
        $instructor = User::factory()->instructor()->create();
        $module = Module::factory()->create(['competency_id' => Competency::factory()]);
        $pages = collect(range(1, 3))->map(fn ($n) => ModulePage::factory()->create(['module_id' => $module->id, 'number' => $n]));

        $this->actingAs($instructor)->delete(route('instructor.lessons.pages.destroy', $pages[0]));

        $this->assertDatabaseMissing('module_pages', ['id' => $pages[0]->id]);
        $this->assertDatabaseHas('module_pages', ['id' => $pages[1]->id, 'number' => 1]);
        $this->assertDatabaseHas('module_pages', ['id' => $pages[2]->id, 'number' => 2]);
    }

    public function test_an_instructor_can_create_a_quiz_add_items_and_publish_it(): void
    {
        $instructor = User::factory()->instructor()->create();
        $competency = Competency::factory()->create();
        $section = Section::factory()->create();

        $create = $this->actingAs($instructor)->post(route('instructor.quizzes.store'), [
            'title' => 'Self-check 9.9, safety',
            'competency_id' => $competency->id,
            'pass_mark' => 75,
            'section_ids' => [$section->id],
        ]);

        $quiz = Quiz::firstWhere('title', 'Self-check 9.9, safety');
        $this->assertNotNull($quiz);
        $create->assertRedirect(route('instructor.quizzes.edit', $quiz));
        $this->assertFalse($quiz->is_published);

        $this->actingAs($instructor)->post(route('instructor.quizzes.items.store', $quiz), [
            'stem' => 'Which setting checks a broken wire?',
            'choices' => ['DC volts', 'Continuity', 'AC volts', 'Current'],
            'correct_index' => 1,
        ])->assertRedirect();

        $this->assertDatabaseHas('quiz_items', ['quiz_id' => $quiz->id, 'number' => 1, 'correct_index' => 1]);

        $this->actingAs($instructor)->post(route('instructor.quizzes.publish', $quiz));
        $this->assertTrue($quiz->refresh()->is_published);
    }

    public function test_an_instructor_can_draft_quiz_items_with_ai(): void
    {
        config(['services.openrouter.key' => 'test-key']);
        $content = json_encode(['items' => [
            ['stem' => 'Which setting checks a broken wire?', 'choices' => ['DC volts', 'Continuity', 'AC volts', 'Current'], 'correct_index' => 1, 'rationale' => 'Continuity beeps on a closed path.'],
            ['stem' => 'Missing a choice', 'choices' => ['A', 'B', 'C'], 'correct_index' => 0],
        ]]);
        Http::fake(['openrouter.ai/*' => Http::response(['choices' => [['message' => ['content' => "```json\n{$content}\n```"]]]])]);

        $instructor = User::factory()->instructor()->create();
        $quiz = Quiz::factory()->draft()->create(['competency_id' => Competency::factory()]);
        QuizItem::factory()->create(['quiz_id' => $quiz->id, 'number' => 1]);

        $this->actingAs($instructor)
            ->post(route('instructor.quizzes.items.generate', $quiz), ['count' => 5, 'focus' => 'multimeter'])
            ->assertRedirect()
            ->assertSessionHas('status', 'Added 1 AI-drafted item. Check each answer before you publish.');

        $item = $quiz->items()->where('number', 2)->first();
        $this->assertNotNull($item, 'the malformed item is dropped and the good one is numbered after the existing one');
        $this->assertSame('Continuity', $item->choices[$item->correct_index], 'the answer survives the choice shuffle');
        $this->assertFalse($quiz->refresh()->is_published);
        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer test-key')
            && str_contains($request['messages'][1]['content'], 'multimeter'));
    }

    public function test_ai_drafting_reports_a_failure_without_adding_items(): void
    {
        config(['services.openrouter.key' => 'test-key']);
        Http::fake(['openrouter.ai/*' => Http::response(['error' => 'rate limited'], 429)]);

        $instructor = User::factory()->instructor()->create();
        $quiz = Quiz::factory()->draft()->create(['competency_id' => Competency::factory()]);

        $this->actingAs($instructor)
            ->post(route('instructor.quizzes.items.generate', $quiz), ['count' => 3])
            ->assertSessionHas('status', 'The free AI limit was reached for now. Wait a minute and try again.');

        $this->assertSame(0, $quiz->items()->count());
    }

    public function test_a_quiz_cannot_be_published_without_items_or_sections(): void
    {
        $instructor = User::factory()->instructor()->create();
        $quiz = Quiz::factory()->draft()->create(['competency_id' => Competency::factory()]);

        $this->actingAs($instructor)->post(route('instructor.quizzes.publish', $quiz));
        $this->assertFalse($quiz->refresh()->is_published);

        QuizItem::factory()->create(['quiz_id' => $quiz->id, 'number' => 1]);
        $this->actingAs($instructor)->post(route('instructor.quizzes.publish', $quiz));
        $this->assertFalse($quiz->refresh()->is_published, 'still needs a section');
    }

    public function test_an_instructor_can_message_a_student_in_their_section(): void
    {
        $section = Section::factory()->create();
        $instructor = User::factory()->instructor()->create(['section_id' => $section->id]);
        $student = User::factory()->create(['role' => User::ROLE_STUDENT, 'section_id' => $section->id]);

        $this->actingAs($instructor)->post(route('instructor.messages.store'), [
            'recipient_id' => $student->id,
            'body' => 'Come see me sa shop tomorrow.',
        ])->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'sender_id' => $instructor->id,
            'recipient_id' => $student->id,
            'body' => 'Come see me sa shop tomorrow.',
        ]);
    }

    public function test_an_instructor_cannot_message_a_student_from_another_section(): void
    {
        $instructor = User::factory()->instructor()->create(['section_id' => Section::factory()->create()->id]);
        $student = User::factory()->create(['role' => User::ROLE_STUDENT, 'section_id' => Section::factory()->create()->id]);

        $this->actingAs($instructor)->post(route('instructor.messages.store'), [
            'recipient_id' => $student->id,
            'body' => 'Hello',
        ])->assertForbidden();
    }

    public function test_students_cannot_reach_instructor_content_tools(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)->get(route('instructor.lessons.index'))->assertRedirect(route('dashboard'));
        $this->actingAs($student)->get(route('instructor.quizzes.create'))->assertRedirect(route('dashboard'));
    }
}
