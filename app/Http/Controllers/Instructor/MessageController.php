<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'recipient_id' => ['required', Rule::exists(User::class, 'id')->where('role', User::ROLE_STUDENT)],
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $recipient = User::findOrFail($validated['recipient_id']);

        abort_unless($recipient->section_id === $request->user()->section_id, 403);

        Message::create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $recipient->id,
            'subject' => 'A note from your instructor',
            'body' => $validated['body'],
        ]);

        return back()->with('status', "Message sent to {$recipient->firstName()}. It shows on their dashboard and stays until read.");
    }
}
