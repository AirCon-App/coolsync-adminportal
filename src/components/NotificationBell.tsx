import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TbBell, TbAlertTriangle, TbPackage } from "react-icons/tb";
import {
  notificationsApi,
  type Notification,
  type NotificationList,
} from "../data/notifications-api";

const POLL_MS = 60_000;

function routeFor(n: Notification): string {
  return n.type === "PastDueWorkOrder" ? "/workorders" : "/inventory";
}

// Visual level matching the inventory list: No Stock (bright red) > Critical (red) > Low (amber).
function levelFor(n: Notification): "nostock" | "critical" | "low" {
  if (n.type === "OutOfStock") return "nostock";
  if (n.severity === "Critical") return "critical";
  return "low";
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "PastDueWorkOrder") return <TbAlertTriangle size={16} />;
  return <TbPackage size={16} />;
}

interface NotificationBellProps {
  buildingId: number;
}

export default function NotificationBell({ buildingId }: NotificationBellProps) {
  const [data, setData] = useState<NotificationList>({ unreadCount: 0, items: [] });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!buildingId) return;
    try {
      const res = await notificationsApi.list(buildingId);
      setData(res.data);
    } catch {
      // Transient — the badge simply keeps its last known value until the next poll.
    }
  }, [buildingId]);

  // Poll while the tab is visible; refresh immediately on building switch / tab focus.
  useEffect(() => {
    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpen = async (n: Notification) => {
    setOpen(false);
    if (!n.isRead) {
      try {
        await notificationsApi.markRead(n.id);
      } catch {
        /* navigation still proceeds */
      }
    }
    navigate(routeFor(n));
    refresh();
  };

  const handleMarkAll = async () => {
    setData((d) => ({ unreadCount: 0, items: d.items.map((i) => ({ ...i, isRead: true })) }));
    try {
      await notificationsApi.markAllRead(buildingId);
    } finally {
      refresh();
    }
  };

  const { unreadCount } = data;
  // Newest first, regardless of API order.
  const items = [...data.items].sort((a, b) => b.firstDetectedUtc.localeCompare(a.firstDetectedUtc));

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell__trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <TbBell size={20} />
        {unreadCount > 0 && (
          <span className="notif-bell__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-bell__panel" role="menu">
          <div className="notif-bell__header">
            <span>Notifications</span>
            {items.some((i) => !i.isRead) && (
              <button type="button" className="notif-bell__markall" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="notif-bell__empty">You're all caught up.</div>
          ) : (
            <ul className="notif-bell__list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item notif-item--${levelFor(n)} ${
                    n.isRead ? "notif-item--read" : ""
                  }`}
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => handleOpen(n)}
                  onKeyDown={(e) => e.key === "Enter" && handleOpen(n)}
                >
                  <span className="notif-item__icon">
                    <NotificationIcon type={n.type} />
                  </span>
                  <span className="notif-item__body">{n.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
