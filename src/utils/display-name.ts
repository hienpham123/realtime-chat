export const displayNameFromEmail = (email: string): string => {
  const part = email.split('@')[0] ?? email;
  return part.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const resolveDisplayName = (
  email: string,
  displayName?: string | null,
): string => {
  const trimmed = displayName?.trim();
  if (trimmed) {
    return trimmed;
  }
  return displayNameFromEmail(email);
};
