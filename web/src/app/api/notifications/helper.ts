import { isLocalEnv, getLocalDb, saveLocalDb, getDbTarget } from "../localDbHelper";

interface CreateNotificationParams {
  recipient_uid: string;
  type: "assignment_new" | "assignment_results" | "message_new" | "friend_request" | "group_invite" | string;
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
  payload?: {
    group_id?: string;
    assignment_id?: string;
    thread_id?: string;
    deep_link?: string;
    sender_id?: string;
    [key: string]: any;
  };
}

/**
 * Creates and persists a notification for a specific user.
 * Supports both local development (JSON) and production MongoDB.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  const { recipient_uid, type, title, title_ar, body, body_ar, payload } = params;

  const newNotif = {
    _id: "ntf_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    recipient_uid,
    type,
    title,
    title_ar,
    body,
    body_ar,
    payload: payload || {},
    read: false,
    createdAt: Date.now()
  };

  try {
    if (isLocalEnv()) {
      const db = getLocalDb();
      if (!db.notifications) {
        db.notifications = [];
      }
      db.notifications.push(newNotif);
      saveLocalDb(db);
      console.log(`[Notification Helper] Locally created notification ${newNotif._id} for ${recipient_uid}`);
      return true;
    }

    const { proxyRequest } = require("../proxy");
    const proxyRes = await proxyRequest("/notifications", "POST", params);
    if (proxyRes.ok) {
      console.log(`[Notification Helper] Backend created notification via proxy for ${recipient_uid}`);
      return true;
    } else {
      console.error(`[Notification Helper] Backend failed to create notification:`, await proxyRes.text());
      return false;
    }
  } catch (err) {
    console.error("[Notification Helper] Error creating notification:", err);
    return false;
  }
}
