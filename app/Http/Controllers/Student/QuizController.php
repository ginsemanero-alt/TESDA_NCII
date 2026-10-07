<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizScore;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class QuizController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();

        $quizzes = $this->assignedQuizzes($user)
            ->map(function (Quiz $quiz) use ($user): array {
                $attempts = $quiz->attempts->where('user_id', $user->id)->sortByDesc('attempt_number');

                return [
                    'quiz' => $quiz,
                    'attempts_used' => $attempts->count(),
                    'attempts_left' => max(0, $quiz->max_attempts - $attempts->count()),
                    'best' => $attempts->max('score'),
                    'latest' => $attempts->first(),
                ];
            });

        return view('student.quizzes.index', [
            'navLinks' => ['Dashboard' => false, 'Modules' => false, 'Quizzes' => true, 'Simulations' => false],
            'quizzes' => $quizzes,
        ]);
    }

    public function show(Request $request, Quiz $quiz): View|RedirectResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->load('items', 'competency');

        $used = $quiz->attempts()->where('user_id', $request->user()->id)->count();

        if ($used >= $quiz->max_attempts) {
            return redirect()->route('student.quizzes.result', $quiz);
        }

        return view('student.quizzes.take', [
            'navLinks' => ['Dashboard' => false, 'Modules' => false, 'Quizzes' => true, 'Simulations' => false],
            'quiz' => $quiz,
            'attemptNumber' => $used + 1,
        ]);
    }

    public function submit(Request $request, Quiz $quiz): RedirectResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->load('items');

        $used = $quiz->attempts()->where('user_id', $request->user()->id)->count();
        if ($used >= $quiz->max_attempts) {
            throw ValidationException::withMessages(['quiz' => 'You have used all your attempts for this quiz.']);
        }

        $validated = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['nullable', 'integer', 'min:0', 'max:3'],
        ]);

        $answers = collect($validated['answers']);
        $correct = $quiz->items->filter(
            fn ($item): bool => (int) $answers->get((string) $item->id, -1) === (int) $item->correct_index
        )->count();

        $total = $quiz->items->count();
        $percent = $total > 0 ? (int) round($correct / $total * 100) : 0;

        QuizScore::create([
            'user_id' => $request->user()->id,
            'competency_id' => $quiz->competency_id,
            'quiz_id' => $quiz->id,
            'title' => $quiz->title,
            'score' => $correct,
            'total' => $total,
            'answers' => $answers->all(),
            'attempt_number' => $used + 1,
            'status' => $percent >= $quiz->pass_mark ? QuizScore::STATUS_PASSED : QuizScore::STATUS_RETAKE,
            'taken_on' => now(),
        ]);

        return redirect()->route('student.quizzes.result', $quiz)->with(
            'status',
            $percent >= $quiz->pass_mark
                ? "Passed with {$correct}/{$total}. Nice work."
                : "You got {$correct}/{$total}. Review the items you missed and try again."
        );
    }

    public function result(Request $request, Quiz $quiz): View|RedirectResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->load('items', 'competency');

        $attempt = $quiz->attempts()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('attempt_number')
            ->first();

        if ($attempt === null) {
            return redirect()->route('student.quizzes.show', $quiz);
        }

        $used = $quiz->attempts()->where('user_id', $request->user()->id)->count();

        return view('student.quizzes.result', [
            'navLinks' => ['Dashboard' => false, 'Modules' => false, 'Quizzes' => true, 'Simulations' => false],
            'quiz' => $quiz,
            'attempt' => $attempt,
            'answers' => collect($attempt->answers ?? []),
            'attemptsLeft' => max(0, $quiz->max_attempts - $used),
        ]);
    }

    /**
     * @return Collection<int, Quiz>
     */
    protected function assignedQuizzes($user): Collection
    {
        if ($user->section_id === null) {
            return collect();
        }

        return Quiz::query()
            ->where('is_published', true)
            ->whereHas('sections', fn ($query) => $query->whereKey($user->section_id))
            ->with(['competency', 'items:id,quiz_id', 'attempts'])
            ->orderBy('title')
            ->get();
    }

    protected function authorizeQuiz(Request $request, Quiz $quiz): void
    {
        abort_unless(
            $quiz->is_published
            && $request->user()->section_id !== null
            && $quiz->sections()->whereKey($request->user()->section_id)->exists(),
            403,
        );
    }
}
