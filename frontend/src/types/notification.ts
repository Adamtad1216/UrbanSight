export interface SystemNotification {
  _id: string;
  userId: string;
  message: string;
  requestId?: string | null;
  issueId?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSummaryResponse {
  success: boolean;
  unreadCount: number;
  notifications: SystemNotification[];
}

export interface NotificationListResponse {
  success: boolean;
  notifications: SystemNotification[];
}
