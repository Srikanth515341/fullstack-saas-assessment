'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Subscribes to /api/realtime/tasks (SSE) and refreshes the Server Component
// data whenever this user's tasks change anywhere — another browser tab,
// another device, or the public API — without polling.
export function RealtimeTaskRefresh() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource('/api/realtime/tasks');

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'ping') {
          router.refresh();
        }
      } catch {
        // ignore malformed/heartbeat payloads
      }
    };

    return () => source.close();
  }, [router]);

  return null;
}
