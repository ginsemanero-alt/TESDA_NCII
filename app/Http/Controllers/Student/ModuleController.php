<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Simulations\AttemptTokens;
use App\Simulations\SimulationRegistry;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index(Request $request): View
    {
        $progress = $request->user()->moduleProgress()->get()->keyBy('module_id');

        $competencies = Competency::query()
            ->with('modules.pages:id,module_id')
            ->orderBy('sort')
            ->get()
            ->map(fn (Competency $competency): array => [
                'competency' => $competency,
                'modules' => $competency->modules->map(fn (Module $module): array => [
                    'module' => $module,
                    'pages' => $module->pages->count(),
                    'status' => $progress->get($module->id)?->status ?? ModuleProgress::STATUS_NOT_STARTED,
                    'current_page' => (int) ($progress->get($module->id)?->current_page ?? 0),
                ]),
            ]);

        return view('student.modules.index', [
            'navLinks' => ['Dashboard' => false, 'Modules' => true, 'Quizzes' => false, 'Simulations' => false],
            'competencies' => $competencies,
        ]);
    }

    public function show(Request $request, Module $module, AttemptTokens $tokens): View
    {
        $module->load(['competency', 'pages']);

        abort_if($module->pages->isEmpty(), 404);

        $page = max(1, min($request->integer('p', 1), $module->pages->count()));

        $state = ModuleProgress::query()->firstOrNew([
            'user_id' => $request->user()->id,
            'module_id' => $module->id,
        ]);

        if ($state->status !== ModuleProgress::STATUS_DONE) {
            $state->current_page = max((int) $state->current_page, $page);
            $state->status = $state->current_page >= $module->pages->count()
                ? ModuleProgress::STATUS_DONE
                : ModuleProgress::STATUS_IN_PROGRESS;
            $state->save();
        }

        $current = $module->pages->firstWhere('number', $page) ?? $module->pages->get($page - 1);
        $simulation = $current->isSimulation() ? SimulationRegistry::find($current->simulation_key) : null;

        return view('student.modules.read', [
            'navLinks' => ['Dashboard' => false, 'Modules' => true, 'Quizzes' => false, 'Simulations' => false],
            'module' => $module,
            'page' => $current,
            'pageNumber' => $page,
            'pageCount' => $module->pages->count(),
            'progress' => $state,
            'simulation' => $simulation,
            'issued' => $simulation ? $tokens->issue($request->user(), $simulation, $current) : null,
        ]);
    }

    public function complete(Request $request, Module $module): RedirectResponse
    {
        $pageCount = $module->pages()->count();

        ModuleProgress::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'module_id' => $module->id],
            ['status' => ModuleProgress::STATUS_DONE, 'current_page' => $pageCount],
        );

        return redirect()
            ->route('student.modules.index')
            ->with('status', "Marked \"{$module->title}\" as done. Your competency progress is updated.");
    }
}
