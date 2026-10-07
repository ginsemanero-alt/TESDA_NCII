<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\JobSheetSubmission;
use App\Models\ModuleProgress;
use App\Simulations\Resistor\ResistorLab;
use App\Simulations\SimulationRegistry;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function __invoke(Request $request): View
    {
        $user = $request->user();

        /** @var Collection<int, ModuleProgress> $progress */
        $progress = $user->moduleProgress()->with('module.competency')->get();
        $progressByModule = $progress->keyBy('module_id');

        $competencies = Competency::query()
            ->with('modules')
            ->orderBy('sort')
            ->get()
            ->map(fn (Competency $competency): array => $this->competencyCard($competency, $progressByModule))
            ->filter(fn (array $card): bool => $card['modules']->isNotEmpty())
            ->values();

        $current = $progress
            ->where('status', ModuleProgress::STATUS_IN_PROGRESS)
            ->sortByDesc('updated_at')
            ->first();

        $quizScores = $user->quizScores()->latest('taken_on')->latest('id')->limit(3)->get();

        $lastSimulation = $user->simulationAttempts()->latest('completed_at')->latest('id')->first();

        $messages = $user->receivedMessages()->with('sender')->latest()->limit(4)->get();

        $announcements = $user->section
            ? $user->section->announcements()->with('author')->latest()->limit(3)->get()
            : collect();

        $awaitingSignOff = $user->jobSheetSubmissions()
            ->where('status', JobSheetSubmission::STATUS_PENDING)
            ->latest('submitted_at')
            ->get();

        $savedPages = $progress->sum(fn (ModuleProgress $p): int => $p->status === ModuleProgress::STATUS_DONE
            ? (int) ($p->module->page_count ?? 0)
            : (int) $p->current_page);

        return view('student.dashboard', [
            'navLinks' => ['Dashboard' => true, 'Modules' => false, 'Quizzes' => false, 'Simulations' => false],
            'student' => $user,
            'current' => $current ? [
                'module' => $current->module,
                'title' => $current->module->title,
                'competency_code' => $current->module->competency->code,
                'page' => $current->current_page,
                'pages' => $current->module->page_count,
                'percent' => $current->module->page_count > 0
                    ? (int) round($current->current_page / $current->module->page_count * 100)
                    : 0,
            ] : null,
            'competencies' => $competencies,
            'quizScores' => $quizScores,
            'lastSimulation' => $lastSimulation,
            'simulation' => SimulationRegistry::find($lastSimulation?->simulation_key ?? ResistorLab::KEY),
            'announcements' => $announcements,
            'messages' => $messages,
            'awaitingSignOff' => $awaitingSignOff,
            'savedPages' => $savedPages,
        ]);
    }

    /**
     * @param  Collection<int, ModuleProgress>  $progressByModule
     * @return array{code: string, title: string, percent: int, modules: Collection<int, array<string, mixed>>}
     */
    protected function competencyCard(Competency $competency, Collection $progressByModule): array
    {
        $totalPages = 0;
        $donePages = 0;

        $modules = $competency->modules->map(function ($module) use ($progressByModule, &$totalPages, &$donePages): array {
            $state = $progressByModule->get($module->id);
            $status = $state?->status ?? ModuleProgress::STATUS_NOT_STARTED;
            $page = (int) ($state?->current_page ?? 0);

            $totalPages += $module->page_count;
            $donePages += match ($status) {
                ModuleProgress::STATUS_DONE => $module->page_count,
                ModuleProgress::STATUS_IN_PROGRESS => min($page, $module->page_count),
                default => 0,
            };

            return [
                'id' => $module->id,
                'number' => $module->number,
                'title' => $module->title,
                'status' => $status,
                'label' => match ($status) {
                    ModuleProgress::STATUS_DONE => 'Done',
                    ModuleProgress::STATUS_IN_PROGRESS => "Page {$page} of {$module->page_count}",
                    default => 'Not started',
                },
            ];
        });

        return [
            'code' => $competency->code,
            'title' => $competency->short_title,
            'percent' => $totalPages > 0 ? (int) round($donePages / $totalPages * 100) : 0,
            'modules' => $modules,
        ];
    }
}
