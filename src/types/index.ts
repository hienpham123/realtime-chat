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

export interface MessageReactionDbRow {
  emoji: string;
  user_id: string;
}

export interface MessageRow {
  id: string;
  content: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  attachments?: unknown;
  profiles: ProfileRow | ProfileRow[] | null;
  message_reactions?: MessageReactionDbRow[] | null;
}

export interface MessageReactionChip {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  user_id: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  attachments: MessageAttachment[];
  reactions: MessageReactionChip[];
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
