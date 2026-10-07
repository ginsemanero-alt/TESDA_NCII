<?php

namespace Tests\Feature;

use App\Models\Competency;
use App\Models\Quiz;
use App\Models\QuizItem;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentQuizTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Section, 1: User, 2: Quiz}
     */
    protected function publishedQuiz(int $items = 3): array
    {
        $section = Section::factory()->create();
        $student = User::factory()->create(['role' => User::ROLE_STUDENT, 'section_id' => $section->id]);
        $quiz = Quiz::factory()->create(['is_published' => true, 'pass_mark' => 60, 'max_attempts' => 2, 'competency_id' => Competency::factory()]);
        $quiz->sections()->attach($section->id);

        foreach (range(1, $items) as $number) {
            QuizItem::factory()->create([
                'quiz_id' => $quiz->id,
                'number' => $number,
                'choices' => ['A', 'B', 'C', 'D'],
                'correct_index' => 0,
            ]);
        }

        return [$section, $student, $quiz->load('items')];
    }

    public function test_a_student_sees_quizzes_assigned_to_their_section(): void
    {
        [, $student, $quiz] = $this->publishedQuiz();

        $this->actingAs($student)->get(route('student.quizzes.index'))
            ->assertOk()
            ->assertSee($quiz->title);
    }

    public function test_a_student_cannot_open_a_quiz_for_another_section(): void
    {
        [, , $quiz] = $this->publishedQuiz();
        $outsider = User::factory()->create(['role' => User::ROLE_STUDENT, 'section_id' => Section::factory()->create()->id]);

        $this->actingAs($outsider)->get(route('student.quizzes.show', $quiz))->assertForbidden();
    }

    public function test_submitting_a_quiz_scores_it_and_records_the_attempt(): void
    {
        [, $student, $quiz] = $this->publishedQuiz(3);
        $answers = $quiz->items->mapWithKeys(fn ($item) => [$item->id => 0])->all();

        $this->actingAs($student)
            ->post(route('student.quizzes.submit', $quiz), ['answers' => $answers])
            ->assertRedirect(route('student.quizzes.result', $quiz));

        $this->assertDatabaseHas('quiz_scores', [
            'user_id' => $student->id,
            'quiz_id' => $quiz->id,
            'score' => 3,
            'total' => 3,
            'status' => 'passed',
            'attempt_number' => 1,
        ]);
    }

    public function test_a_wrong_answer_lowers_the_score(): void
    {
        [, $student, $quiz] = $this->publishedQuiz(4);
        $answers = $quiz->items->mapWithKeys(fn ($item, $i) => [$item->id => $i === 0 ? 1 : 0])->all();

        $this->actingAs($student)->post(route('student.quizzes.submit', $quiz), ['answers' => $answers]);

        $this->assertDatabaseHas('quiz_scores', ['user_id' => $student->id, 'quiz_id' => $quiz->id, 'score' => 3, 'total' => 4]);
    }

    public function test_attempts_are_capped(): void
    {
        [, $student, $quiz] = $this->publishedQuiz(2);
        $answers = $quiz->items->mapWithKeys(fn ($item) => [$item->id => 0])->all();

        $this->actingAs($student)->post(route('student.quizzes.submit', $quiz), ['answers' => $answers]);
        $this->actingAs($student)->post(route('student.quizzes.submit', $quiz), ['answers' => $answers]);

        $this->actingAs($student)->get(route('student.quizzes.show', $quiz))
            ->assertRedirect(route('student.quizzes.result', $quiz));

        $this->assertSame(2, $quiz->attempts()->where('user_id', $student->id)->count());
    }

    public function test_the_result_page_shows_the_review(): void
    {
        [, $student, $quiz] = $this->publishedQuiz(2);
        $answers = $quiz->items->mapWithKeys(fn ($item) => [$item->id => 3])->all();

        $this->actingAs($student)->post(route('student.quizzes.submit', $quiz), ['answers' => $answers]);

        $this->actingAs($student)->get(route('student.quizzes.result', $quiz))
            ->assertOk()
            ->assertSee('Item review');
    }
}
