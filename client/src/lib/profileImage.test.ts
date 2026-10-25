import { describe, expect, it } from "vitest";
import { getProfileImageUrl } from "./profileImage";

describe("getProfileImageUrl", () => {
  it("uses a persisted HTTP(S) profile image URL when present", () => {
    expect(getProfileImageUrl({ profileImageUrl: "https://cdn.example.com/avatar.jpg" })).toBe("https://cdn.example.com/avatar.jpg");
    expect(getProfileImageUrl({ avatarUrl: "http://localhost:3000/avatar.jpg" })).toBe("http://localhost:3000/avatar.jpg");
  });

  it("rejects unavailable and unsupported image values so the initials fallback can render", () => {
    expect(getProfileImageUrl({ name: "Mira Ahmed" })).toBeUndefined();
    expect(getProfileImageUrl({ avatar: "javascript:alert(1)" })).toBeUndefined();
    expect(getProfileImageUrl(null)).toBeUndefined();
  });
});
