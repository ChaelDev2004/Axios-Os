"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { EmptyState } from "@/components/axion/views/empty-state";

const s: Record<string, CSSProperties> = {
  headerRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
  list: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  itemRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontWeight: 500,
    color: "var(--foreground)",
  },
  message: {
    marginTop: 4,
    fontSize: 14,
    color: "var(--muted-foreground)",
  },
  timestamp: {
    marginTop: 4,
    fontSize: 10,
    color: "var(--muted-foreground)",
  },
};

export function NotificationsView() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead({
    onError: (e) => toast.error(e.message),
  });
  const markAll = useMarkAllNotificationsRead({
    onSuccess: () => toast.success("All marked as read"),
    onError: (e) => toast.error(e.message),
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="axion-card">
      <div style={s.headerRow}>
        <div>
          <div className="axion-kicker">Activity</div>
          <h2 className="axion-title">Notification Center</h2>
          <p style={s.subtitle}>
            {unread} unread · {notifications.length} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          style={{ borderRadius: "9999px", borderColor: "rgba(255,255,255,0.1)" }}
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate(undefined)}
        >
          Mark all read
        </Button>
      </div>
      <div style={s.list}>
        {isLoading ? (
          <EmptyState title="Loading…" />
        ) : notifications.length === 0 ? (
          <EmptyState description="You're all caught up." />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="axion-soft"
              style={{
                ...s.itemRow,
                boxShadow: !n.read ? "0 0 0 1px rgba(129,140,248,0.3)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ ...s.title, color: !n.read ? "#c7d2fe" : "var(--foreground)" }}>
                  {n.title}
                </div>
                <div style={s.message}>{n.message}</div>
                <div style={s.timestamp}>
                  {new Date(n.created_at).toLocaleString("en-PH")}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                style={{ flexShrink: 0, borderRadius: "9999px", borderColor: "rgba(255,255,255,0.1)" }}
                disabled={n.read || markRead.isPending}
                onClick={() => markRead.mutate(n.id)}
              >
                {n.read ? "Read" : "Mark"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}