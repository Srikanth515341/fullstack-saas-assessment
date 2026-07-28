'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Plus, Check, X } from 'lucide-react';
import { createTask } from './actions';
import type { TaskCategory } from '@/lib/db/schema';

type Suggestion = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
};

export function SuggestTasksButton({
  categories,
  label
}: {
  existingTitles: string[];
  categories: TaskCategory[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setSuggestions([]);
    setAddedTitles(new Set());

    const response = await fetch('/api/ai/suggest-tasks', { method: 'POST' });
    if (!response.body) {
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const match = chunk.match(/^data: (.*)$/);
        if (!match || match[1] === '[DONE]') continue;
        try {
          setSuggestions((prev) => [...prev, JSON.parse(match[1])]);
        } catch {
          // ignore malformed chunk
        }
      }
    }

    setLoading(false);
  }

  async function handleAdd(suggestion: Suggestion) {
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === suggestion.category?.toLowerCase()
    );

    const formData = new FormData();
    formData.set('title', suggestion.title);
    formData.set('description', suggestion.description);
    formData.set('priority', suggestion.priority);
    if (matchedCategory) {
      formData.set('categoryId', String(matchedCategory.id));
    }

    await createTask({}, formData);
    setAddedTitles((prev) => new Set(prev).add(suggestion.title));
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Suggested tasks
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {suggestions.length === 0 && loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}

              {suggestions.map((s, i) => (
                <div
                  key={`${s.title}-${i}`}
                  className="border border-gray-100 rounded-md p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs capitalize bg-gray-100 rounded-full px-2 py-0.5">
                        {s.priority}
                      </span>
                      {s.category && (
                        <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                          {s.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addedTitles.has(s.title)}
                    onClick={() => handleAdd(s)}
                  >
                    {addedTitles.has(s.title) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              {loading && suggestions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating more...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
