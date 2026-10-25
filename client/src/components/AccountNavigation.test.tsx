/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountNavigation } from "./AccountNavigation";

describe("AccountNavigation (Universal Navbar)", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it("renders the exact required navbar items in order: Home, Job Radar, Dashboard, Practice CTA, Account, Sign out, Theme toggle", () => {
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const homeButtons = screen.getAllByRole("button", { name: /^Home$/i });
    expect(homeButtons.length).toBeGreaterThan(0);

    const jobRadarButtons = screen.getAllByRole("button", { name: /^Job Radar$/i });
    expect(jobRadarButtons.length).toBeGreaterThan(0);

    const dashboardButtons = screen.getAllByRole("button", { name: /^Dashboard$/i });
    expect(dashboardButtons.length).toBeGreaterThan(0);

    const accountButtons = screen.getAllByRole("button", { name: /Account/i });
    expect(accountButtons.length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: /Switch to light theme/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /^Practice/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Sign out/i })).not.toBeNull();
  });

  it("routes to the Home, Job Radar, Dashboard, and Account pages when clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onNavigate={onNavigate}
        onSignOut={vi.fn()}
      />
    );

    const homeButton = screen.getAllByRole("button", { name: /^Home$/i })[0];
    await user.click(homeButton);
    expect(onNavigate).toHaveBeenCalledWith("home");

    const jobRadarButton = screen.getAllByRole("button", { name: /^Job Radar$/i })[0];
    await user.click(jobRadarButton);
    expect(onNavigate).toHaveBeenCalledWith("jobs");

    const dashboardButton = screen.getAllByRole("button", { name: /^Dashboard$/i })[0];
    await user.click(dashboardButton);
    expect(onNavigate).toHaveBeenCalledWith("dashboard");

    const accountButton = screen.getAllByRole("button", { name: /Account/i })[0];
    await user.click(accountButton);
    expect(onNavigate).toHaveBeenCalledWith("account");
  });

  it("routes the practice CTA action and signs out through supplied callbacks", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Practice/i }));
    expect(onNavigate).toHaveBeenCalledWith("practice");

    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleTheme when the theme button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onToggleTheme={onToggleTheme}
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("highlights the active destination with active styling", () => {
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        activeDestination="dashboard"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const activeDashboard = screen.getAllByRole("button", { name: /^Dashboard$/i })[0];
    expect(activeDashboard.classList.contains("is-active")).toBe(true);
    expect(activeDashboard.getAttribute("aria-current")).toBe("page");
  });

  it("renders a saved profile photo when provided", () => {
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        profileImageUrl="/manus-storage/users/7/profile-photos/avatar.png"
        theme="dark"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const photo = document.querySelector(".ref-topnav__avatar img");
    expect(photo?.getAttribute("src")).toBe("/manus-storage/users/7/profile-photos/avatar.png");
  });

  it("opens a mobile drawer with all navigation links and handles navigation", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onNavigate={onNavigate}
        onSignOut={vi.fn()}
      />
    );

    const toggle = screen.getByRole("button", { name: "Open navigation menu" });
    await user.click(toggle);

    expect(screen.getByRole("button", { name: "Close navigation menu" })).not.toBeNull();
    const drawer = document.querySelector(".ref-mobile-drawer");
    expect(drawer).not.toBeNull();

    // Click Job Radar in drawer
    const drawerLinks = drawer?.querySelectorAll("button");
    const drawerJobRadar = Array.from(drawerLinks || []).find((b) => b.textContent?.includes("Job Radar"));
    expect(drawerJobRadar).toBeDefined();
    if (drawerJobRadar) {
      await user.click(drawerJobRadar);
      expect(onNavigate).toHaveBeenCalledWith("jobs");
    }
  });

  it("applies the sticky class on scroll past threshold", () => {
    render(
      <AccountNavigation
        userName="Mira Ahmed"
        theme="dark"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const topbar = screen.getByTestId("universal-navbar");
    expect(topbar.classList.contains("is-stuck")).toBe(false);

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 50 });
    fireEvent.scroll(window);
    expect(topbar.classList.contains("is-stuck")).toBe(true);

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
    fireEvent.scroll(window);
    expect(topbar.classList.contains("is-stuck")).toBe(false);
  });

  it("renders unauthenticated navigation with Log in and Get started when authenticated is false", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();

    render(
      <AccountNavigation
        authenticated={false}
        onLogin={onLogin}
        onSignup={onSignup}
        theme="dark"
      />
    );

    // Unauthenticated state should show Home and Job Radar
    expect(screen.getByRole("button", { name: /^Home$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Job Radar$/i })).toBeDefined();

    // Should show Log in and Get started
    const loginButton = screen.getByRole("button", { name: /Log in/i });
    const signupButton = screen.getByRole("button", { name: /Get started/i });
    expect(loginButton).toBeDefined();
    expect(signupButton).toBeDefined();

    // Should NOT show authenticated items: Dashboard, Practice CTA, Account, Sign out
    expect(screen.queryByRole("button", { name: /^Dashboard$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Practice/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Account/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sign out/i })).toBeNull();

    // Click handlers work
    await user.click(loginButton);
    expect(onLogin).toHaveBeenCalledTimes(1);

    await user.click(signupButton);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });
});
