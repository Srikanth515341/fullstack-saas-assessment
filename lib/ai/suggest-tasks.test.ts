import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateTaskSuggestions } from './suggest-tasks';

describe('generateTaskSuggestions', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to stub suggestions when no provider is configured', async () => {
    const suggestions = await generateTaskSuggestions(['Buy milk'], ['Errands']);

    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(suggestion.title.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(suggestion.priority);
    }
  });

  it('always returns the same shape regardless of input', async () => {
    const withInput = await generateTaskSuggestions(['a', 'b'], ['c']);
    const withoutInput = await generateTaskSuggestions([], []);

    expect(withInput.length).toBe(withoutInput.length);
  });
});
