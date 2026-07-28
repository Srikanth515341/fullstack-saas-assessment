'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Notification } from '@/lib/db/schema';
import { markNotificationRead, markAllNotificationsRead } from './notification-actions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Polling, not websockets — deliberately simple, matches the assessment's
// "what it teaches" for this feature (polling, read/unread state).
const POLL_INTERVAL_MS = 15000;

function timeAgo(date: string | Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    user ? '/api/notifications' : null,
    fetcher,
    { refreshInterval: POLL_INTERVAL_MS }
  );

  if (!user) {
    return null;
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      mutate('/api/notifications');
    }
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    mutate('/api/notifications');
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-sm text-gray-500 text-center">
            No notifications yet.
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex flex-col items-start gap-0.5 cursor-pointer whitespace-normal ${
                !n.read ? 'bg-orange-50' : ''
              }`}
            >
              <span className="text-sm">{n.message}</span>
              <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
