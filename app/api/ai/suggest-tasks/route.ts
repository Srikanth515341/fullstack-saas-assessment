import { getUser, getTaskCategoriesForUser, getTasksForUser } from '@/lib/db/queries';
import { generateTaskSuggestions } from '@/lib/ai/suggest-tasks';
import { rateLimit } from '@/lib/rate-limit';

// Streams one suggestion at a time as SSE — even the stub suggestions are
// "streamed" with a short delay between chunks, so the UI genuinely
// progressively renders results rather than waiting for one big response,
// matching the real behavior a live LLM call would have.
export async function POST() {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Reuses the rate limiter built for the public API (#18) — an LLM-backed
  // endpoint is exactly the kind of thing worth protecting from abuse.
  const limited = rateLimit(`ai:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
  }

  const [tasks, categories] = await Promise.all([
    getTasksForUser(),
    getTaskCategoriesForUser()
  ]);

  const suggestions = await generateTaskSuggestions(
    tasks.map((task) => task.title),
    categories.map((category) => category.name)
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const suggestion of suggestions) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(suggestion)}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
