<?php

namespace App\Quizzes;

use App\Models\Quiz;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Drafts multiple-choice items for a quiz through OpenRouter. The instructor
 * still reviews them on the edit screen and publishes by hand.
 */
class QuizItemGenerator
{
    public function isConfigured(): bool
    {
        return filled(config('services.openrouter.key'));
    }

    /**
     * @return list<array{stem: string, choices: list<string>, correct_index: int, rationale: string|null}>
     *
     * @throws RuntimeException with a message safe to show the instructor
     */
    public function generate(Quiz $quiz, int $count, ?string $focus = null): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('AI generation is not set up yet. Add OPENROUTER_API_KEY to the server settings.');
        }

        $quiz->loadMissing('competency', 'items');

        try {
            $response = Http::withToken(config('services.openrouter.key'))
                ->withHeaders(['X-Title' => config('app.name')])
                ->timeout(config('services.openrouter.timeout'))
                ->post(config('services.openrouter.url'), [
                    'models' => array_slice(config('services.openrouter.models'), 0, 3),
                    // Thinking models otherwise spend most of the timeout reasoning.
                    'reasoning' => ['enabled' => false],
                    'temperature' => 0.4,
                    'messages' => [
                        ['role' => 'system', 'content' => $this->systemPrompt()],
                        ['role' => 'user', 'content' => $this->userPrompt($quiz, $count, $focus)],
                    ],
                ]);
        } catch (ConnectionException $e) {
            Log::warning('OpenRouter quiz generation could not connect', ['error' => $e->getMessage()]);

            throw new RuntimeException(str_contains($e->getMessage(), 'timed out')
                ? 'The AI service took too long to answer. Try again, or ask for fewer items.'
                : 'Could not reach the AI service. Check the internet connection and try again.');
        }

        if ($response->failed()) {
            Log::warning('OpenRouter quiz generation failed', ['status' => $response->status(), 'body' => $response->body()]);

            throw new RuntimeException(match ($response->status()) {
                401, 403 => 'The AI key was rejected. Check OPENROUTER_API_KEY in the server settings.',
                429 => 'The free AI limit was reached for now. Wait a minute and try again.',
                default => 'The AI service had a problem. Try again in a moment.',
            });
        }

        $items = $this->parseItems((string) $response->json('choices.0.message.content'));

        if ($items === []) {
            throw new RuntimeException('The AI answer could not be read as quiz items. Try again.');
        }

        return array_slice($items, 0, $count);
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
        You write quiz items for TESDA Electronic Products Assembly and Servicing (EPAS) NC II,
        taught to Grade 11 and 12 students in the Philippines. Each item is multiple choice with
        exactly four choices and one correct answer. Keep stems short and concrete, use plain
        English, and base every item on accepted shop practice and basic electronics. Distractors
        must be plausible but clearly wrong. The rationale explains in one sentence why the
        answer is right.

        Reply with JSON only, no prose and no code fences, in this shape:
        {"items":[{"stem":"...","choices":["...","...","...","..."],"correct_index":0,"rationale":"..."}]}
        correct_index is the 0-based position of the right choice.
        PROMPT;
    }

    protected function userPrompt(Quiz $quiz, int $count, ?string $focus): string
    {
        $competency = $quiz->competency;
        $lines = [
            "Write {$count} new items for the quiz \"{$quiz->title}\".",
            "Competency: {$competency->code}, {$competency->title}.",
        ];

        if (filled($competency->summary)) {
            $lines[] = "Competency summary: {$competency->summary}";
        }

        if (filled($focus)) {
            $lines[] = "Focus the items on: {$focus}";
        }

        if ($quiz->items->isNotEmpty()) {
            $lines[] = 'Do not repeat these existing questions:';
            foreach ($quiz->items as $item) {
                $lines[] = "- {$item->stem}";
            }
        }

        return implode("\n", $lines);
    }

    /**
     * @return list<array{stem: string, choices: list<string>, correct_index: int, rationale: string|null}>
     */
    protected function parseItems(string $content): array
    {
        // Free models sometimes wrap the JSON in fences or a sentence; keep the outer object.
        $start = strpos($content, '{');
        $end = strrpos($content, '}');
        if ($start === false || $end === false) {
            return [];
        }

        $decoded = json_decode(substr($content, $start, $end - $start + 1), true);
        $rows = is_array($decoded) ? ($decoded['items'] ?? []) : [];

        $items = [];
        foreach (is_array($rows) ? $rows : [] as $row) {
            $stem = trim((string) ($row['stem'] ?? ''));
            $choices = array_map(fn ($c): string => trim((string) $c), array_values((array) ($row['choices'] ?? [])));
            $correct = $row['correct_index'] ?? null;

            if ($stem === '' || count(array_unique($choices)) !== 4 || in_array('', $choices, true)
                || ! is_numeric($correct) || (int) $correct < 0 || (int) $correct > 3) {
                continue;
            }

            // Models favour "A" as the answer; shuffle so the key is not predictable.
            $answer = $choices[(int) $correct];
            shuffle($choices);

            $rationale = trim((string) ($row['rationale'] ?? ''));

            $items[] = [
                'stem' => mb_substr($stem, 0, 500),
                'choices' => array_map(fn (string $c): string => mb_substr($c, 0, 200), $choices),
                'correct_index' => array_search($answer, $choices, true),
                'rationale' => $rationale === '' ? null : mb_substr($rationale, 0, 300),
            ];
        }

        return $items;
    }
}
