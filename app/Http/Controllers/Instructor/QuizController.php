<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Competency;
use App\Models\Quiz;
use App\Models\QuizItem;
use App\Models\Section;
use App\Quizzes\QuizItemGenerator;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use RuntimeException;

class QuizController extends Controller
{
    public function index(): View
    {
        $quizzes = Quiz::query()
            ->with(['competency', 'sections'])
            ->withCount('items')
            ->latest()
            ->get();

        return view('instructor.quizzes.index', [
            'navLinks' => ['Classes' => false, 'Lessons' => false, 'Quizzes' => true],
            'quizzes' => $quizzes,
        ]);
    }

    public function create(): View
    {
        return view('instructor.quizzes.create', [
            'navLinks' => ['Classes' => false, 'Lessons' => false, 'Quizzes' => true],
            'competencies' => Competency::orderBy('sort')->get(),
            'sections' => Section::orderBy('grade_level')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'competency_id' => ['required', Rule::exists(Competency::class, 'id')],
            'reference' => ['nullable', 'string', 'max:60'],
            'pass_mark' => ['required', 'integer', 'min:1', 'max:100'],
            'section_ids' => ['array'],
            'section_ids.*' => [Rule::exists(Section::class, 'id')],
        ]);

        $quiz = Quiz::create([
            'title' => $validated['title'],
            'competency_id' => $validated['competency_id'],
            'reference' => $validated['reference'] ?? null,
            'pass_mark' => $validated['pass_mark'],
            'author_id' => $request->user()->id,
            'is_published' => false,
        ]);

        $quiz->sections()->sync($validated['section_ids'] ?? []);

        return redirect()
            ->route('instructor.quizzes.edit', $quiz)
            ->with('status', 'Quiz created. Add items, then publish it to open it for the section.');
    }

    public function edit(Quiz $quiz): View
    {
        $quiz->load(['items', 'competency', 'sections']);

        return view('instructor.quizzes.edit', [
            'navLinks' => ['Classes' => false, 'Lessons' => false, 'Quizzes' => true],
            'quiz' => $quiz,
            'sections' => Section::orderBy('grade_level')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Quiz $quiz): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'pass_mark' => ['required', 'integer', 'min:1', 'max:100'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:9'],
            'section_ids' => ['array'],
            'section_ids.*' => [Rule::exists(Section::class, 'id')],
        ]);

        $quiz->update([
            'title' => $validated['title'],
            'pass_mark' => $validated['pass_mark'],
            'max_attempts' => $validated['max_attempts'],
        ]);
        $quiz->sections()->sync($validated['section_ids'] ?? []);

        return back()->with('status', 'Quiz settings saved.');
    }

    public function storeItem(Request $request, Quiz $quiz): RedirectResponse
    {
        $validated = $request->validate([
            'stem' => ['required', 'string', 'max:500'],
            'choices' => ['required', 'array', 'size:4'],
            'choices.*' => ['required', 'string', 'max:200'],
            'correct_index' => ['required', 'integer', 'min:0', 'max:3'],
            'rationale' => ['nullable', 'string', 'max:300'],
        ]);

        $quiz->items()->create([
            'number' => (int) $quiz->items()->max('number') + 1,
            'stem' => $validated['stem'],
            'choices' => array_values($validated['choices']),
            'correct_index' => $validated['correct_index'],
            'rationale' => $validated['rationale'] ?? null,
        ]);

        return back()->with('status', 'Item added.');
    }

    public function generateItems(Request $request, Quiz $quiz, QuizItemGenerator $generator): RedirectResponse
    {
        $validated = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:10'],
            'focus' => ['nullable', 'string', 'max:300'],
        ]);

        try {
            $items = $generator->generate($quiz, (int) $validated['count'], $validated['focus'] ?? null);
        } catch (RuntimeException $e) {
            return back()->withInput()->with('status', $e->getMessage());
        }

        $number = (int) $quiz->items()->max('number');
        foreach ($items as $item) {
            $quiz->items()->create([...$item, 'number' => ++$number]);
        }

        $added = count($items);

        return back()->with('status', "Added {$added} AI-drafted ".Str::plural('item', $added).'. Check each answer before you publish.');
    }

    public function destroyItem(QuizItem $item): RedirectResponse
    {
        $quiz = $item->quiz;
        $item->delete();

        $quiz->items()->orderBy('number')->get()
            ->each(fn (QuizItem $i, int $index) => $i->update(['number' => $index + 1]));

        return back()->with('status', 'Item removed.');
    }

    public function publish(Request $request, Quiz $quiz): RedirectResponse
    {
        if (! $quiz->is_published) {
            if ($quiz->items()->count() === 0 || $quiz->sections()->count() === 0) {
                return back()->with('status', 'Add at least one item and assign a section before publishing.');
            }

            $quiz->update(['is_published' => true]);
            ActivityLog::create([
                'category' => ActivityLog::CATEGORY_CONTENT,
                'description' => "Published quiz \"{$quiz->title}\"",
                'actor' => "{$request->user()->name}, instructor",
                'device' => $request->userAgent(),
                'occurred_at' => now(),
            ]);

            return back()->with('status', 'Quiz published. It is now open for the assigned sections.');
        }

        $quiz->update(['is_published' => false]);

        return back()->with('status', 'Quiz unpublished. Students can no longer open it.');
    }
}
