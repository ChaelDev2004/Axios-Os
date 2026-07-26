"use client";

import { useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  CheckCheck,
  Clock3,
  Sparkles,
  Wallet,
  ListTodo,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import type { Notification } from "@/features/auth/types/database.types";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function notificationIcon(type: string | null) {
  switch (type) {
    case "finance_reminder":
      return <Wallet className="h-3.5 w-3.5" />;
    case "task_reminder":
    case "task":
      return <ListTodo className="h-3.5 w-3.5" />;
    case "ai":
      return <Sparkles className="h-3.5 w-3.5" />;
    default:
      return <Info className="h-3.5 w-3.5" />;
  }
}

type NotificationsDropdownProps = {
  onViewAll: () => void;
};

export function NotificationsDropdown({ onViewAll }: NotificationsDropdownProps) {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead({
    onError: (e) => toast.error(e.message),
  });
  const markAll = useMarkAllNotificationsRead({
    onSuccess: () => toast.success("All marked as read"),
    onError: (e) => toast.error(e.message),
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const newest = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="axion-notif-trigger"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="axion-notif-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="axion-dropdown axion-notif-menu z-50 w-[min(92vw,22.5rem)] overflow-hidden rounded-2xl p-0"
      >
        <div className="axion-notif-header">
          <div className="min-w-0">
            <p className="axion-notif-title">Notifications</p>
            <p className="axion-notif-subtitle">
              {unreadCount > 0
                ? `${unreadCount} unread · showing newest 5`
                : "You're all caught up"}
            </p>
          </div>
          <DropdownMenu.Item
            disabled={unreadCount === 0 || markAll.isPending}
            className="axion-notif-mark-all outline-none"
            onSelect={(e) => {
              e.preventDefault();
              if (unreadCount === 0) return;
              markAll.mutate(undefined);
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all
          </DropdownMenu.Item>
        </div>

        <div className="axion-notif-list">
          {isLoading ? (
            <div className="axion-notif-empty">Loading notifications…</div>
          ) : newest.length === 0 ? (
            <div className="axion-notif-empty">
              <Bell className="mx-auto mb-2 h-5 w-5 opacity-50" />
              No notifications yet
            </div>
          ) : (
            newest.map((n: Notification) => (
              <DropdownMenu.Item
                key={n.id}
                className={cn(
                  "axion-notif-item outline-none",
                  !n.read && "is-unread"
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.read) markRead.mutate(n.id);
                }}
              >
                <span className={cn("axion-notif-icon", !n.read && "is-unread")}>
                  {notificationIcon(n.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="axion-notif-item-title truncate">{n.title}</span>
                    {!n.read ? <span className="axion-notif-dot" aria-hidden /> : null}
                  </span>
                  <span className="axion-notif-item-message line-clamp-2">
                    {n.message}
                  </span>
                  <span className="axion-notif-item-time">
                    <Clock3 className="h-3 w-3" />
                    {formatRelativeTime(n.created_at)}
                  </span>
                </span>
              </DropdownMenu.Item>
            ))
          )}
        </div>

        <div className="axion-notif-footer">
          <DropdownMenu.Item
            className="axion-notif-view-all outline-none"
            onSelect={() => onViewAll()}
          >
            View all notifications
          </DropdownMenu.Item>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
