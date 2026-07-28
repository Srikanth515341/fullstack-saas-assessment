import { isAiConfigured, callAiProvider } from './providers';

export type TaskSuggestion = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
};

// Returned when no AI_PROVIDER/*_API_KEY is configured, or if the real call
// fails for any reason — the feature always produces something usable
// rather than an error state, same pattern as every other stub in this app.
const STUB_SUGGESTIONS: TaskSuggestion[] = [
  {
    title: 'Review open pull requests',
    description: 'Check the team repo for PRs waiting on review.',
    priority: 'medium',
    category: null
  },
  {
    title: 'Write weekly status update',
    description: 'Summarize progress for the team channel.',
    priority: 'low',
    category: null
  },
  {
    title: 'Fix flaky CI test',
    description: 'Investigate the intermittent failure in the test suite.',
    priority: 'high',
    category: null
  },
  {
    title: 'Update dependencies',
    description: "Run the package manager's outdated check and patch what's safe.",
    priority: 'low',
    category: null
  }
];

function buildPrompt(existingTitles: string[], categories: string[]): string {
  return `You are helping a user manage their to-do list in a task management app.
Existing tasks: ${existingTitles.length ? existingTitles.join(', ') : '(none yet)'}
Existing categories: ${categories.length ? categories.join(', ') : '(none)'}

Suggest exactly 4 new, distinct tasks that would reasonably follow from the tasks above (or general productivity tasks if there are none yet). For each, provide a short title (under 60 characters), a one-sentence description, a priority of "low", "medium", or "high", and a category name if one of the existing categories fits (otherwise null).

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"title": "...", "description": "...", "priority": "low", "category": null}]`;
}

function parseSuggestions(raw: string): TaskSuggestion[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a JSON array');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON array');
  }

  return parsed
    .filter((item) => item && typeof item.title === 'string')
    .slice(0, 6)
    .map((item) => ({
      title: String(item.title).slice(0, 200),
      description: typeof item.description === 'string' ? item.description.slice(0, 500) : '',
      priority: (['low', 'medium', 'high'] as const).includes(item.priority)
        ? item.priority
        : 'medium',
      category: typeof item.category === 'string' ? item.category : null
    }));
}

export async function generateTaskSuggestions(
  existingTitles: string[],
  categories: string[]
): Promise<TaskSuggestion[]> {
  if (!isAiConfigured()) {
    return STUB_SUGGESTIONS;
  }

  try {
    const raw = await callAiProvider(buildPrompt(existingTitles, categories));
    return parseSuggestions(raw);
  } catch (error) {
    console.warn(
      'AI suggestion generation failed, falling back to stub suggestions:',
      error instanceof Error ? error.message : error
    );
    return STUB_SUGGESTIONS;
  }
}
