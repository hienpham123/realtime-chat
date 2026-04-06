export interface ProfileRow {
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export type MessageAttachmentKind = 'image' | 'file';

export interface MessageAttachment {
  url: string;
  path: string;
  kind: MessageAttachmentKind;
  name: string;
  mimeType: string;
  size?: number;
}

export interface MessageRow {
  id: string;
  content: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
  attachments?: unknown;
  profiles: ProfileRow | ProfileRow[] | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  attachments: MessageAttachment[];
}

export type ConversationKind = 'channel' | 'direct' | 'group';

export interface PublicProfile {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ConversationMemberPreview {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  title: string | null;
  created_at: string;
  /** Thời điểm hoạt động gần nhất (tin nhắn mới nhất), fallback created_at */
  last_activity_at: string;
  /** Nội dung tin cuối (server); null nếu chưa có tin */
  last_message_preview: string | null;
  /** Số tin chưa đọc (so với last_read_at của user) */
  unread_count: number;
  displayLabel: string;
  members: ConversationMemberPreview[];
}
