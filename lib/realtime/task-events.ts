import { EventEmitter } from 'node:events';

// In-process pub/sub — real, working real-time updates for a single server
// instance, using native EventEmitter + Server-Sent Events (no dependency
// needed). This does NOT work across multiple serverless instances, since
// each one has its own memory — that's exactly the gap Pusher (or any
// hosted pub/sub) closes in production.
//
// To wire up real Pusher:
//   1. pnpm add pusher pusher-js
//   2. Add PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER to .env
//   3. Replace `publishTaskEvent` with `pusherServer.trigger(`user-${userId}`, 'task-changed', event)`
//   4. Replace the SSE route + EventSource client hook with `pusher-js`'s
//      `Pusher.subscribe(...)` — the rest of the app doesn't need to change,
//      since both approaches end in the same "refresh the task list" action.

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type TaskEvent = {
  type: 'created' | 'updated' | 'deleted' | 'restored';
};

function channelName(userId: number) {
  return `user:${userId}`;
}

export function publishTaskEvent(userId: number, event: TaskEvent) {
  emitter.emit(channelName(userId), event);
}

export function subscribeToTaskEvents(
  userId: number,
  onEvent: (event: TaskEvent) => void
) {
  const channel = channelName(userId);
  emitter.on(channel, onEvent);
  return () => emitter.off(channel, onEvent);
}
