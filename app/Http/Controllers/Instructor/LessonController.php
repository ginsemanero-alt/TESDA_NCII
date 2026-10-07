<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Competency;
use App\Models\Module;
use App\Models\ModulePage;
use App\Simulations\SimulationRegistry;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LessonController extends Controller
{
    public function index(): View
    {
        $competencies = Competency::query()
            ->with(['modules' => fn ($query) => $query->withCount('pages')])
            ->orderBy('sort')
            ->get();

        return view('instructor.lessons.index', [
            'navLinks' => ['Classes' => false, 'Lessons' => true, 'Quizzes' => false],
            'competencies' => $competencies,
        ]);
    }

    public function edit(Module $module): View
    {
        $module->load(['competency', 'pages']);

        return view('instructor.lessons.edit', [
            'navLinks' => ['Classes' => false, 'Lessons' => true, 'Quizzes' => false],
            'module' => $module,
            'simulations' => SimulationRegistry::all(),
        ]);
    }

    public function storePage(Request $request, Module $module): RedirectResponse
    {
        $validated = $this->validatePage($request);

        $module->pages()->create([
            'number' => (int) $module->pages()->max('number') + 1,
            ...$validated,
        ]);

        $module->update(['page_count' => $module->pages()->count()]);
        $this->log($request, "Added a page to \"{$module->title}\"");

        return back()->with('status', 'Page added. Students see it the next time they open the module.');
    }

    public function updatePage(Request $request, ModulePage $page): RedirectResponse
    {
        $page->update($this->validatePage($request));

        return back()->with('status', 'Page saved.');
    }

    public function destroyPage(Request $request, ModulePage $page): RedirectResponse
    {
        $module = $page->module;
        $page->delete();

        $module->pages()
            ->orderBy('number')
            ->get()
            ->each(fn (ModulePage $p, int $i) => $p->update(['number' => $i + 1]));
        $module->update(['page_count' => $module->pages()->count()]);

        return back()->with('status', 'Page removed.');
    }

    /**
     * A text page needs a body. A simulation page picks a lab from the fixed
     * list and may carry a short intro the student reads above it.
     *
     * @return array{type: string, simulation_key: string|null, heading: string, body: string}
     */
    protected function validatePage(Request $request): array
    {
        $validated = $request->validate([
            'type' => ['nullable', Rule::in([ModulePage::TYPE_TEXT, ModulePage::TYPE_SIMULATION])],
            'simulation_key' => [
                Rule::requiredIf($request->input('type') === ModulePage::TYPE_SIMULATION),
                'nullable',
                Rule::in(SimulationRegistry::keys()),
            ],
            'heading' => ['required', 'string', 'max:150'],
            'body' => [
                Rule::requiredIf($request->input('type', ModulePage::TYPE_TEXT) !== ModulePage::TYPE_SIMULATION),
                'nullable',
                'string',
                'max:8000',
            ],
        ]);

        $type = $validated['type'] ?? ModulePage::TYPE_TEXT;

        return [
            'type' => $type,
            'simulation_key' => $type === ModulePage::TYPE_SIMULATION ? $validated['simulation_key'] : null,
            'heading' => $validated['heading'],
            'body' => (string) ($validated['body'] ?? ''),
        ];
    }

    protected function log(Request $request, string $description): void
    {
        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_CONTENT,
            'description' => $description,
            'actor' => "{$request->user()->name}, instructor",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);
    }
}
