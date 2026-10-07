<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ModulePage;
use App\Models\ModuleProgress;
use App\Models\SimulationAttempt;
use App\Simulations\AttemptTokens;
use App\Simulations\Simulation;
use App\Simulations\SimulationRegistry;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SimulationController extends Controller
{
    public function index(Request $request): View
    {
        $attempts = $request->user()->simulationAttempts()->latest('completed_at')->get()->groupBy('simulation_key');

        $simulations = collect(SimulationRegistry::all())->map(fn (Simulation $simulation): array => [
            'simulation' => $simulation,
            'last' => $attempts->get($simulation->key())?->first(),
            'best' => $attempts->get($simulation->key())?->sortByDesc(fn (SimulationAttempt $a): int => $a->percent())->first(),
            'count' => $attempts->get($simulation->key())?->count() ?? 0,
        ]);

        return view('student.simulations.index', [
            'navLinks' => $this->navLinks(),
            'simulations' => $simulations,
        ]);
    }

    public function show(Request $request, string $simulation, AttemptTokens $tokens): View
    {
        $lab = SimulationRegistry::find($simulation);
        abort_if($lab === null, 404);

        return view('student.simulations.show', [
            'navLinks' => $this->navLinks(),
            'simulation' => $lab,
            'issued' => $tokens->issue($request->user(), $lab),
            'last' => $request->user()->simulationAttempts()->where('simulation_key', $lab->key())->latest('completed_at')->first(),
        ]);
    }

    public function storeAttempt(Request $request, string $simulation, AttemptTokens $tokens): JsonResponse
    {
        $lab = SimulationRegistry::find($simulation);
        abort_if($lab === null, 404);

        $validated = $request->validate([
            'token' => ['required', 'string', 'size:40'],
            'answers' => ['present', 'array'],
            // Labs that cannot be scored in the browser (an open-ended circuit) send no score.
            'score' => [Rule::requiredIf($lab->reportsLocalScore()), 'nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $user = $request->user();
        $entry = $tokens->find($user, $validated['token']);

        if ($entry === null || $entry['simulation_key'] !== $lab->key()) {
            return response()->json([
                'message' => 'This set of checkpoints has expired. Reload the page to get a fresh set.',
            ], 422);
        }

        $results = $lab->grade($entry['checkpoints'], $validated['answers']);

        if ($results === null) {
            return response()->json(['message' => 'Some answers could not be read. Check each checkpoint and try again.'], 422);
        }

        $score = collect($results)->where('correct', true)->count();
        $maxScore = count($entry['checkpoints']);

        // The browser grades with the same rules for instant feedback. If its
        // score differs from ours, the request was altered: refuse it.
        if ($lab->reportsLocalScore() && (int) $validated['score'] !== $score) {
            return response()->json(['message' => 'The submitted score does not match the graded answers.'], 422);
        }

        $tokens->forget($validated['token']);

        $attempt = $user->simulationAttempts()->create([
            'simulation_key' => $lab->key(),
            'module_page_id' => $entry['module_page_id'],
            'score' => $score,
            'max_score' => $maxScore,
            'payload' => [
                'checkpoints' => $entry['checkpoints'],
                'answers' => $validated['answers'],
                'results' => $results,
            ],
            'completed_at' => now(),
        ]);

        $page = $entry['module_page_id'] ? ModulePage::query()->with('module')->find($entry['module_page_id']) : null;

        if ($page !== null && $attempt->passed()) {
            $this->advanceProgress($user->id, $page);
        }

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_CONTENT,
            'description' => "{$lab->title()}: {$score} of {$maxScore} checkpoints".($attempt->passed() ? ', passed' : ', retake'),
            'actor' => "{$user->name}, student",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'attempt' => [
                'score' => $score,
                'max_score' => $maxScore,
                'percent' => $attempt->percent(),
                'passed' => $attempt->passed(),
                'pass_percent' => SimulationAttempt::PASS_PERCENT,
            ],
            'results' => $results,
            'next' => $tokens->issue($user, $lab, $page),
        ]);
    }

    /**
     * A passed lab counts as reading its page, the same rule the module reader
     * uses; on the last page that completes the module.
     */
    protected function advanceProgress(int $userId, ModulePage $page): void
    {
        $pageCount = $page->module->pages()->count();

        $state = ModuleProgress::query()->firstOrNew([
            'user_id' => $userId,
            'module_id' => $page->module_id,
        ]);

        if ($state->status === ModuleProgress::STATUS_DONE) {
            return;
        }

        $state->current_page = max((int) $state->current_page, $page->number);
        $state->status = $state->current_page >= $pageCount
            ? ModuleProgress::STATUS_DONE
            : ModuleProgress::STATUS_IN_PROGRESS;
        $state->save();
    }

    /**
     * @return array<string, bool>
     */
    protected function navLinks(): array
    {
        return ['Dashboard' => false, 'Modules' => false, 'Quizzes' => false, 'Simulations' => true];
    }
}
