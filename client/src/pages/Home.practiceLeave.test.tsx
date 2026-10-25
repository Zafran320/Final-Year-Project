// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "FutureMaker User", email: "user@example.com" }, loading: false, isAuthenticated: true, logout: mocks.logout }),
}));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    careerProfile: { get: { useQuery: () => ({ data: null, isLoading: false }) } },
    practicePreparation: {
      analyze: { useMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false, reset: mocks.reset }) },
      getLatestSession: { useQuery: () => ({ data: null, isLoading: false }) },
    },
  },
}));
vi.mock("@/lib/profileImage", () => ({ getProfileImageUrl: () => undefined }));
vi.mock("@/components/WelcomeExperience", () => ({ WelcomeExperience: () => <main>Homepage</main> }));

import Home from "./Home";

describe("Practice leave confirmation", () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.mutateAsync.mockReset();
    mocks.reset.mockReset();
    vi.stubGlobal("scrollTo", vi.fn());
    window.history.replaceState({}, "", "/?screen=consent");
    window.history.pushState({}, "", "/?screen=company-prep");
  });

  afterEach(() => cleanup());

  it("keeps active company preparation input when a navbar exit is cancelled and discards it only after confirmation", async () => {
    render(<Home />);
    const companyInput = screen.getByLabelText(/Company name/i);
    fireEvent.change(companyInput, { target: { value: "Example Co" } });
    await waitFor(() => expect((companyInput as HTMLInputElement).value).toBe("Example Co"));

    fireEvent.click(screen.getByRole("button", { name: "Return to FutureMaker homepage" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Leave preparation?");
    expect(dialog.textContent).toContain("not saved");
    fireEvent.click(screen.getByRole("button", { name: "Stay here" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByLabelText(/Company name/i) as HTMLInputElement).value).toBe("Example Co");

    fireEvent.click(screen.getByRole("button", { name: "Return to FutureMaker homepage" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Leave and discard" }));
    await waitFor(() => expect(screen.queryByLabelText(/Company name/i)).toBeNull());
  });

  it("intercepts browser Back while active work is present and restores the Company Preparation route on cancel", async () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: "Example Co" } });

    window.history.back();
    await screen.findByRole("dialog");
    await waitFor(() => expect(window.location.search).toBe("?screen=company-prep"));

    fireEvent.click(screen.getByRole("button", { name: "Stay here" }));
    expect((screen.getByLabelText(/Company name/i) as HTMLInputElement).value).toBe("Example Co");
  });
});
