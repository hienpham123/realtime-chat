import type { ChatMessage } from '@/types';
import type { ExtractedChatLink } from '@/utils/extract-chat-links';
import { extractLinksFromText } from '@/utils/extract-chat-links';

const PREVIEW_IMAGE_SLOTS = 3;

export interface SharedImagePreview {
  key: string;
  url: string;
  messageId: string;
}

export interface SharedFileItem {
  key: string;
  url: string;
  name: string;
  messageId: string;
}

export interface ConversationSharedSummary {
  imagePreview: SharedImagePreview[];
  imageExtraCount: number;
  files: SharedFileItem[];
  links: ExtractedChatLink[];
}

export const buildConversationSharedSummary = (
  messages: ChatMessage[],
): ConversationSharedSummary => {
  const images: SharedImagePreview[] = [];
  const files: SharedFileItem[] = [];
  const linksMap = new Map<string, ExtractedChatLink>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    for (const a of m.attachments) {
      const key = `${m.id}:${a.path}`;
      if (a.kind === 'image') {
        images.push({ key, url: a.url, messageId: m.id });
      } else {
        files.push({ key, url: a.url, name: a.name, messageId: m.id });
      }
    }
    for (const link of extractLinksFromText(m.content)) {
      if (!linksMap.has(link.url)) {
        linksMap.set(link.url, link);
      }
    }
  }

  const imagePreview = images.slice(0, PREVIEW_IMAGE_SLOTS);
  const imageExtraCount = Math.max(0, images.length - PREVIEW_IMAGE_SLOTS);

  return {
    imagePreview,
    imageExtraCount,
    files,
    links: [...linksMap.values()],
  };
};
