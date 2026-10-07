<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\JobSheetSubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JobSheetReviewController extends Controller
{
    /**
     * Sign a job sheet off as achieved, or send it back to be redone.
     */
    public function update(Request $request, JobSheetSubmission $jobSheetSubmission): RedirectResponse
    {
        $validated = $request->validate([
            'decision' => ['required', Rule::in(['achieved', 'redo'])],
        ]);

        $jobSheetSubmission->update([
            'status' => $validated['decision'] === 'achieved'
                ? JobSheetSubmission::STATUS_ACHIEVED
                : JobSheetSubmission::STATUS_REDO,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $student = $jobSheetSubmission->student->firstName();

        $message = $validated['decision'] === 'achieved'
            ? "Marked achieved. {$student} now sees the competency credited."
            : "Sent back to {$student} with your note to redo it.";

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_CONTENT,
            'description' => "Reviewed {$jobSheetSubmission->label} ({$validated['decision']})",
            'actor' => "{$request->user()->name}, instructor",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return back()->with('status', $message);
    }
}
