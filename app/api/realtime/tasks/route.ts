import { NextRequest } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { subscribeToTaskEvents } from '@/lib/realtime/task-events';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25000;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream already closed on the client side
        }
      };

      unsubscribe = subscribeToTaskEvents(user.id, (event) => {
        send(JSON.stringify(event));
      });

      // Keeps the connection alive through proxies that otherwise time out
      // an idle HTTP connection.
      heartbeat = setInterval(() => send('{"type":"ping"}'), HEARTBEAT_MS);

      request.signal.addEventListener('abort', () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
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
