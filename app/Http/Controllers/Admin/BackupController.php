<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    protected string $disk = 'local';

    protected string $dir = 'backups';

    public function index(): View
    {
        $files = collect(Storage::disk($this->disk)->files($this->dir))
            ->sortDesc()
            ->map(fn (string $path): array => [
                'name' => basename($path),
                'size' => Storage::disk($this->disk)->size($path),
                'made_at' => Storage::disk($this->disk)->lastModified($path),
            ])
            ->values();

        return view('admin.backups.index', [
            'navLinks' => ['Overview' => false, 'Accounts' => false, 'Backups' => true],
            'files' => $files,
            'driver' => DB::connection()->getDriverName(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $connection = DB::connection();
        $name = 'epas-'.now()->format('Y-m-d_His');
        $source = $connection->getDriverName() === 'sqlite' ? $connection->getDatabaseName() : null;

        if ($source !== null && $source !== ':memory:' && is_file($source)) {
            Storage::disk($this->disk)->put("{$this->dir}/{$name}.sqlite", (string) file_get_contents($source));
        } else {
            Storage::disk($this->disk)->put("{$this->dir}/{$name}.json", $this->jsonDump());
        }

        ActivityLog::create([
            'category' => ActivityLog::CATEGORY_SYSTEM,
            'description' => 'Manual backup created',
            'actor' => "{$request->user()->name}, admin",
            'device' => $request->userAgent(),
            'occurred_at' => now(),
        ]);

        return back()->with('status', 'Backup done. It is saved on the school server and ready to download.');
    }

    public function download(string $file): StreamedResponse
    {
        abort_unless(preg_match('/^epas-[\d_-]+\.(sqlite|json)$/', $file) === 1, 404);

        $path = "{$this->dir}/{$file}";
        abort_unless(Storage::disk($this->disk)->exists($path), 404);

        return Storage::disk($this->disk)->download($path);
    }

    protected function jsonDump(): string
    {
        $tables = ['users', 'sections', 'competencies', 'modules', 'module_pages', 'module_progress',
            'quizzes', 'quiz_items', 'quiz_section', 'quiz_scores', 'announcements',
            'job_sheet_submissions', 'activity_logs', 'messages'];

        $data = [];
        foreach ($tables as $table) {
            $data[$table] = DB::table($table)->get()->toArray();
        }

        return (string) json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}
