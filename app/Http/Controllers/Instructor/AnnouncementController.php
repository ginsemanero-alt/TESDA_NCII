<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Section;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    /**
     * Post an announcement to a section's dashboard.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'section_id' => ['required', Rule::exists(Section::class, 'id')],
            'body' => ['required', 'string', 'max:500'],
        ]);

        $announcement = Announcement::create([
            'section_id' => $validated['section_id'],
            'author_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_CONTENT,
            'description' => 'Posted an announcement',
            'actor' => "{$request->user()->name}, instructor",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return redirect()
            ->route('instructor.dashboard', ['section' => $announcement->section_id])
            ->with('status', 'Announcement posted. It shows on the section dashboard and stays until read.');
    }
}
