export function getProfileImageUrl(user: unknown) {
  if (!user || typeof user !== "object") return undefined;

  const record = user as Record<string, unknown>;
  const candidate = record.profileImageUrl ?? record.avatarUrl ?? record.avatar ?? record.image;

  return typeof candidate === "string" && /^(https?:\/\/|\/manus-storage\/)/.test(candidate)
    ? candidate
    : undefined;
}
