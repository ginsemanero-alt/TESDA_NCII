<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\ModuleProgress;
use App\Models\Section;
use App\Models\SimulationAttempt;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class StudentController extends Controller
{
    public function index(Request $request): View
    {
        $sections = Section::query()->orderBy('grade_level')->orderBy('name')->get();
        $section = $sections->firstWhere('id', (int) $request->integer('section'))
            ?? $request->user()->section
            ?? $sections->first();

        abort_if($section === null, 404);

        $competencies = Competency::query()->with('modules')->orderBy('sort')->get();

        $students = User::query()
            ->where('section_id', $section->id)
            ->where('role', User::ROLE_STUDENT)
            ->where('status', '!=', User::STATUS_PENDING)
            ->with(['moduleProgress', 'quizScores', 'simulationAttempts'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $student): array => [
                'student' => $student,
                'percent' => $this->overallPercent($student, $competencies),
                'quiz_average' => $this->quizAverage($student),
                'simulation_best' => $student->simulationAttempts
                    ->sortByDesc(fn (SimulationAttempt $attempt): float => $attempt->max_score > 0 ? $attempt->score / $attempt->max_score : 0)
                    ->first(),
                'last_active' => $student->moduleProgress->max('updated_at'),
                'pending' => $student->status === User::STATUS_PENDING,
                'locked' => $student->status === User::STATUS_LOCKED,
            ]);

        return view('instructor.students.index', [
            'navLinks' => ['Classes' => true, 'Lessons' => false, 'Quizzes' => false],
            'sections' => $sections,
            'section' => $section,
            'students' => $students,
        ]);
    }

    /**
     * @param  Collection<int, Competency>  $competencies
     */
    protected function overallPercent(User $student, $competencies): int
    {
        if ($competencies->isEmpty()) {
            return 0;
        }

        $byModule = $student->moduleProgress->keyBy('module_id');

        return (int) round($competencies->avg(function (Competency $competency) use ($byModule): int {
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
        }));
    }

    protected function quizAverage(User $student): ?int
    {
        if ($student->quizScores->isEmpty()) {
            return null;
        }

        return (int) round($student->quizScores->avg(
            fn ($score): float => $score->total > 0 ? $score->score / $score->total * 100 : 0
        ));
    }
}
