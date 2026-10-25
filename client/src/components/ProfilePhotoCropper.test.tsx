/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePhotoCropper } from "./ProfilePhotoCropper";

describe("ProfilePhotoCropper", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:profile-photo"), revokeObjectURL: vi.fn() });
  });

  it("exposes bounded zoom and rotation controls with reset and cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ProfilePhotoCropper file={new File(["photo"], "portrait.png", { type: "image/png" })} onCancel={onCancel} onConfirm={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Frame your profile photo." })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /Zoom/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Live circular profile photo thumbnail" })).toBeTruthy();
    expect(screen.getByText("Live thumbnail")).toBeTruthy();
    expect(screen.getByText("0°")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Rotate photo right" }));
    expect(screen.getByText("90°")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Reset/i }));
    expect(screen.getByText("0°")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Cancel photo adjustment/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
