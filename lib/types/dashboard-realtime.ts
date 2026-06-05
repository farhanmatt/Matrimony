export type DashboardRealtimeEvent =
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
