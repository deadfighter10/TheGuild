import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import {
  getNotifications,
  subscribeToUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./notification-service"
import type { Notification } from "@/domain/notification"
import { timeAgo } from "@/shared/utils/time"

const NOTIFICATION_ICONS: Record<string, string> = {
  reply: "💬",
  support: "⬆",
  vouch: "🤝",
  flag: "⚑",
  rep_change: "★",
  status_change: "◉",
}

export function NotificationBell() {
  const { guildUser } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<readonly Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!guildUser) return
    return subscribeToUnreadCount(guildUser.uid, setUnreadCount)
  }, [guildUser])

  useEffect(() => {
    if (!open || !guildUser) return
    setLoading(true)
    getNotifications(guildUser.uid)
      .then(setNotifications)
      .finally(() => setLoading(false))
  }, [open, guildUser])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  if (!guildUser) return null

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
    }
    setOpen(false)
    navigate(notif.link)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead(guildUser.uid)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cyan-500 text-void-950 text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite" role="status">
        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : ""}
      </span>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/[0.08] bg-void-900 shadow-2xl shadow-black/50 z-50" role="region" aria-label="Notifications">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-white/30">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-white/30">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-0 ${
                    notif.read ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-sm mt-0.5 shrink-0 w-5 text-center">
                    {NOTIFICATION_ICONS[notif.type] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1 font-mono">
                      {timeAgo(notif.createdAt, { compact: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" aria-label="Unread" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
