const URL_REGEX =
  /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

const safeHost = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const titleFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last && last.includes('.')) {
      return decodeURIComponent(last);
    }
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 48);
  }
};

export interface ExtractedChatLink {
  url: string;
  host: string;
  title: string;
}

export const extractLinksFromText = (text: string): ExtractedChatLink[] => {
  const matches = text.match(URL_REGEX);
  if (!matches) {
    return [];
  }
  const seen = new Set<string>();
  const out: ExtractedChatLink[] = [];
  for (const raw of matches) {
    const url = raw.replace(/[,);.]+$/g, '');
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    out.push({
      url,
      host: safeHost(url),
      title: titleFromUrl(url),
    });
  }
  return out;
};
