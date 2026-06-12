export type DashboardRealtimeEvent =
  | {
      type: "presence_updated";
      profileId: string;
      isOnline: boolean;
      lastActiveAt: string | null;
    }
  | {
      type: "message_created";
      createdAt: string;
      conversationId: string;
      messageId: string;
      fromProfileId: string;
      toProfileId: string;
    }
  | {
      type: "message_updated";
      createdAt: string;
      conversationId: string;
      messageId: string;
      fromProfileId: string;
      toProfileId: string;
    }
  | {
      type: "message_deleted";
      createdAt: string;
      conversationId: string;
      messageId: string;
      fromProfileId: string;
      toProfileId: string;
    };

export const DASHBOARD_REALTIME_EVENT_NAME = "dashboard-realtime-event";
