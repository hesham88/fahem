"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  FiBell, 
  FiCheck, 
  FiMessageSquare, 
  FiBookOpen, 
  FiAward, 
  FiUserPlus, 
  FiUsers, 
  FiCheckSquare, 
  FiCircle, 
  FiInbox,
  FiX
} from "react-icons/fi";

interface Notification {
  _id: string;
  recipient_uid: string;
  type: string;
  title?: string;
  title_ar?: string;
  body?: string;
  body_ar?: string;
  payload?: {
    group_id?: string;
    assignment_id?: string;
    thread_id?: string;
    deep_link?: string;
    sender_id?: string;
  };
  read: boolean;
  createdAt: number;
}

interface NotificationBellProps {
  language: "en" | "ar" | string;
  user: any;
  setActiveTab: (tab: string) => void;
  setSelectedSubjectId: (id: any) => void;
  chatRecipient?: any;
  setChatRecipient?: (recipient: any) => void;
  allUsers?: any[];
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  language,
  user,
  setActiveTab,
  setSelectedSubjectId,
  chatRecipient,
  setChatRecipient,
  allUsers = [],
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRtl = language === "ar";

  // Fetch unread count
  const fetchCount = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.count);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error fetching count:", err);
    }
  };

  // Fetch all notifications
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error fetching list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for count
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 20000); // 20s polling
    return () => clearInterval(interval);
  }, [user]);

  // Refetch notifications list if opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification as read
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent navigating when just checking read
    }
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: [id] })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update local state
          setNotifications(prev => 
            prev.map(n => n._id === id ? { ...n, read: true } : n)
          );
          // Refetch count
          fetchCount();
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error marking read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: [] }) // Empty marks all
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error marking all read:", err);
    }
  };

  // Handle notification click / deep link navigation
  const handleNotificationClick = async (notif: Notification) => {
    // 1. Mark as read first
    if (!notif.read) {
      await markAsRead(notif._id);
    }
    setIsOpen(false);

    const deepLink = notif.payload?.deep_link;
    if (!deepLink) return;

    console.log(`[NotificationBell] Deep-linking to: ${deepLink}`);

    // Parse params from deepLink
    const searchString = deepLink.startsWith("?") ? deepLink : `?${deepLink}`;
    const params = new URLSearchParams(searchString);

    // Dynamic state transitions
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }

    const subjectParam = params.get("subject") || params.get("subjectId") || params.get("subject_id");
    if (subjectParam) {
      setSelectedSubjectId(subjectParam);
    }

    // Special: DM Thread navigation
    const threadId = notif.payload?.thread_id || params.get("thread_id") || notif.payload?.sender_id;
    if (tabParam === "social" && threadId && setChatRecipient && allUsers.length > 0) {
      // Find the user object corresponding to this thread ID
      const recipientUser = allUsers.find(u => u.uid === threadId || u.id === threadId);
      if (recipientUser) {
        setChatRecipient(recipientUser);
      }
    }

    // Special: Library Book navigation
    const bookId = params.get("book") || params.get("bookId") || params.get("book_id");
    const pageParam = params.get("page");
    if (bookId) {
      const page = parseInt(pageParam || "1", 10) || 1;
      setTimeout(() => {
        const event = new CustomEvent("fahemNavigateBook", {
          detail: { bookId, page }
        });
        window.dispatchEvent(event);
      }, 300);
    }

    // Navigate router
    router.push(`/${language}/home${searchString}`);
  };

  // Render correct icon for notification type
  const renderNotifIcon = (type: string) => {
    const iconStyle = { fontSize: "1.2rem", color: "var(--primary)" };
    switch (type) {
      case "assignment_new":
        return <FiBookOpen style={{ ...iconStyle, color: "var(--primary)" }} />;
      case "assignment_results":
        return <FiAward style={{ ...iconStyle, color: "#d4af37" }} />;
      case "message_new":
        return <FiMessageSquare style={{ ...iconStyle, color: "#10b981" }} />;
      case "friend_request":
        return <FiUserPlus style={{ ...iconStyle, color: "#6366f1" }} />;
      case "group_invite":
        return <FiUsers style={{ ...iconStyle, color: "#ec4899" }} />;
      default:
        return <FiBell style={iconStyle} />;
    }
  };

  // Helper for human-readable relative time
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (isRtl) {
      if (seconds < 60) return "الآن";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `منذ ${minutes} د`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `منذ ${hours} س`;
      const days = Math.floor(hours / 24);
      return `منذ ${days} ي`;
    } else {
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  return (
    <div className="notification-bell-container" ref={containerRef} style={{ position: "relative" }}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bell-trigger"
        aria-label="Toggle notifications"
        style={{
          background: "rgba(255, 255, 255, 0.45)",
          border: "1px solid rgba(16, 107, 163, 0.15)",
          color: "var(--primary)",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          outline: "none",
          boxShadow: "0 2px 8px rgba(16, 107, 163, 0.05)",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.05) translateY(-1px)";
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = "var(--secondary)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 107, 163, 0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.45)";
          e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.15)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 107, 163, 0.05)";
        }}
      >
        <FiBell style={{ fontSize: "1.25rem", color: isOpen ? "var(--secondary)" : "var(--primary)" }} />
        {unreadCount > 0 && (
          <span
            className="unread-badge"
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "linear-gradient(135deg, #ef4444, #f43f5e)",
              color: "#ffffff",
              fontSize: "0.72rem",
              fontWeight: 800,
              minWidth: "18px",
              height: "18px",
              borderRadius: "10px",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px #ffffff, 0 0 8px rgba(239, 68, 68, 0.5)",
              animation: "pulse-glow 2s infinite",
            }}
          >
            {unreadCount > 99 ? "+99" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          className="notification-dropdown"
          style={{
            position: "absolute",
            top: "52px",
            [isRtl ? "left" : "right"]: 0,
            width: "360px",
            maxHeight: "480px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(235, 220, 185, 0.4)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px -5px rgba(16, 107, 163, 0.18), 0 0 1px 1px rgba(16, 107, 163, 0.05)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(16, 107, 163, 0.02)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: "var(--primary)" }}>
              {isRtl ? "مركز الإشعارات" : "Notification Center"}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--secondary)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "6px",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(212, 175, 55, 0.1)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <FiCheckSquare style={{ fontSize: "0.9rem" }} />
                <span>{isRtl ? "تحديد الكل كمقروء" : "Mark all as read"}</span>
              </button>
            )}
          </div>

          {/* List Area */}
          <div
            className="custom-scrollbar"
            style={{
              overflowY: "auto",
              flex: 1,
              maxHeight: "380px",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "0.5rem" }}>
                <div className="spinner" style={{ border: "3px solid rgba(16, 107, 163, 0.1)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: "24px", height: "24px", animation: "spin-loader 0.8s linear infinite" }}></div>
                <span style={{ fontSize: "0.82rem", color: "#6a7c88", fontWeight: 500 }}>
                  {isRtl ? "جاري تحميل الإشعارات..." : "Loading notifications..."}
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem", textAlign: "center", gap: "0.75rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16, 107, 163, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a7c88" }}>
                  <FiInbox style={{ fontSize: "1.5rem" }} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
                    {isRtl ? "لا توجد لديك أي إشعارات" : "No Notifications"}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#6a7c88", fontWeight: 500 }}>
                    {isRtl ? "لقد قرأت جميع الإشعارات!" : "You are completely up to date!"}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: "1px solid rgba(16, 107, 163, 0.04)",
                      display: "flex",
                      gap: "0.85rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: notif.read ? "transparent" : "rgba(16, 107, 163, 0.03)",
                      position: "relative",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = notif.read 
                        ? "rgba(16, 107, 163, 0.02)" 
                        : "rgba(16, 107, 163, 0.05)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = notif.read 
                        ? "transparent" 
                        : "rgba(16, 107, 163, 0.03)";
                    }}
                  >
                    {/* Unread marker bar (logical border) */}
                    {!notif.read && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          [isRtl ? "right" : "left"]: 0,
                          width: "4px",
                          background: "linear-gradient(to bottom, var(--primary), var(--secondary))",
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.8)",
                        boxShadow: "0 2px 6px rgba(16, 107, 163, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {renderNotifIcon(notif.type)}
                    </div>

                    {/* Text Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.15rem" }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            fontWeight: notif.read ? 600 : 800,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isRtl ? notif.title_ar || notif.title : notif.title}
                        </h4>
                        <span style={{ fontSize: "0.7rem", color: "#8a9ba8", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.78rem",
                          color: "#5c6f7c",
                          fontWeight: 500,
                          lineHeight: "1.3",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {isRtl ? notif.body_ar || notif.body : notif.body}
                      </p>
                    </div>

                    {/* Mark read checkmark button (if unread) */}
                    {!notif.read && (
                      <button
                        onClick={(e) => markAsRead(notif._id, e)}
                        className="mark-read-btn"
                        title={isRtl ? "تحديد كمقروء" : "Mark as read"}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#a0aec0",
                          padding: "0.2rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "4px",
                          transition: "all 0.15s",
                          alignSelf: "center",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = "var(--primary)";
                          e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = "#a0aec0";
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <FiCheck style={{ fontSize: "0.95rem" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline styles for pulse animations / spinners */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), 0 0 0 2px #ffffff;
          }
          70% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0), 0 0 0 2px #ffffff;
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 0 0 2px #ffffff;
          }
        }
        @keyframes spin-loader {
          to { transform: rotate(360deg); }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
