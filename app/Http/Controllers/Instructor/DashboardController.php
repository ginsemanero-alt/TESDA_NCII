<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\JobSheetSubmission;
use App\Models\ModuleProgress;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\Section;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function __invoke(Request $request): View
    {
        $sections = Section::query()->orderBy('grade_level')->orderBy('name')->get();

        $section = $sections->firstWhere('id', (int) $request->integer('section'))
            ?? $request->user()->section
            ?? $sections->first();

        abort_if($section === null, 404);

        $students = User::query()
            ->where('section_id', $section->id)
            ->where('role', User::ROLE_STUDENT)
            ->where('status', '!=', User::STATUS_PENDING)
            ->with(['moduleProgress', 'quizScores'])
            ->orderBy('name')
            ->get();

        $competencies = Competency::query()->with('modules')->orderBy('sort')->get();

        $progress = $students->map(fn (User $student): array => [
            'student' => $student,
            'percent' => $this->overallPercent($student, $competencies),
            'last_active' => $student->moduleProgress->max('updated_at'),
        ]);

        $queue = JobSheetSubmission::query()
            ->where('section_id', $section->id)
            ->where('status', JobSheetSubmission::STATUS_PENDING)
            ->with('student')
            ->orderBy('submitted_at')
            ->get();

        return view('instructor.dashboard', [
            'hardestItem' => $this->hardestItem($section),
            'navLinks' => ['Classes' => true, 'Lessons' => false, 'Quizzes' => false],
            'sections' => $sections,
            'section' => $section,
            'stats' => [
                'enrolled' => $students->count(),
                'opened_this_week' => $progress->filter(
                    fn (array $row): bool => $row['last_active'] && Carbon::parse($row['last_active'])->gt(now()->subWeek())
                )->count(),
                'average_quiz' => $this->averageQuiz($students),
                'queue' => $queue->count(),
                'behind' => $progress->filter(fn (array $row): bool => $this->isBehind($row))->count(),
            ],
            'queue' => $queue,
            'behind' => $progress
                ->filter(fn (array $row): bool => $this->isBehind($row))
                ->sortBy('percent')
                ->take(5)
                ->map(fn (array $row): array => [
                    'student' => $row['student'],
                    'percent' => $row['percent'],
                    'reason' => $this->behindReason($row),
                ])
                ->values(),
            'classProgress' => $competencies->map(fn (Competency $competency): array => [
                'title' => $competency->short_title,
                'percent' => $students->isEmpty() ? 0 : (int) round(
                    $students->avg(fn (User $student): int => $this->competencyPercent($student, $competency))
                ),
            ]),
        ]);
    }

    /**
     * @param  Collection<int, Competency>  $competencies
     */
    protected function overallPercent(User $student, Collection $competencies): int
    {
        return $competencies->isEmpty() ? 0 : (int) round(
            $competencies->avg(fn (Competency $competency): int => $this->competencyPercent($student, $competency))
        );
    }

    protected function competencyPercent(User $student, Competency $competency): int
    {
        $byModule = $student->moduleProgress->keyBy('module_id');
        $total = 0;
        $done = 0;

        foreach ($competency->modules as $module) {
            $state = $byModule->get($module->id);
            $total += $module->page_count;
            $done += match ($state?->status) {
                ModuleProgress::STATUS_DONE => $module->page_count,
                ModuleProgress::STATUS_IN_PROGRESS => min((int) $state->current_page, $module->page_count),
                default => 0,
            };
        }

        return $total > 0 ? (int) round($done / $total * 100) : 0;
    }

    /**
     * @param  Collection<int, User>  $students
     */
    protected function averageQuiz(Collection $students): int
    {
        $scores = $students->flatMap->quizScores;

        return $scores->isEmpty() ? 0 : (int) round(
            $scores->avg(fn ($score): float => $score->total > 0 ? $score->score / $score->total * 100 : 0)
        );
    }

    /**
     * @param  array{student: User, percent: int, last_active: mixed}  $row
     */
    protected function isBehind(array $row): bool
    {
        if ($row['percent'] < 25) {
            return true;
        }

        return $row['last_active'] === null || Carbon::parse($row['last_active'])->lt(now()->subDays(7));
    }

    /**
     * @param  array{student: User, percent: int, last_active: mixed}  $row
     */
    protected function behindReason(array $row): string
    {
        if ($row['last_active'] === null) {
            return 'No activity yet, still on Module 1';
        }

        $days = (int) Carbon::parse($row['last_active'])->diffInDays(now());

        if ($days >= 7) {
            return "No activity for {$days} days, {$row['percent']}% through";
        }

        return "Only {$row['percent']}% through the competencies";
    }

    /**
     * @return array{stem: string, right: int, total: int}|null
     */
    protected function hardestItem(Section $section): ?array
    {
        $quizIds = Quiz::query()
            ->whereHas('sections', fn ($query) => $query->whereKey($section->id))
            ->pluck('id');

        if ($quizIds->isEmpty()) {
            return null;
        }

        $studentIds = User::query()
            ->where('section_id', $section->id)
            ->where('role', User::ROLE_STUDENT)
            ->where('status', '!=', User::STATUS_PENDING)
            ->pluck('id');

        $attempts = QuizScore::query()
            ->whereIn('quiz_id', $quizIds)
            ->whereIn('user_id', $studentIds)
            ->whereNotNull('answers')
            ->with('quiz.items')
            ->get();

        if ($attempts->isEmpty()) {
            return null;
        }

        $tally = [];
        foreach ($attempts as $attempt) {
            $answers = collect($attempt->answers);
            foreach ($attempt->quiz->items as $item) {
                $tally[$item->id] ??= ['stem' => $item->stem, 'right' => 0, 'total' => 0];
                $tally[$item->id]['total']++;
                if ((int) $answers->get((string) $item->id, -1) === (int) $item->correct_index) {
                    $tally[$item->id]['right']++;
                }
            }
        }

        $worst = collect($tally)
            ->filter(fn (array $row): bool => $row['total'] >= 3)
            ->sortBy(fn (array $row): float => $row['right'] / max($row['total'], 1))
            ->first();

        return $worst ?: null;
    }
}
