/** @vitest-environment jsdom */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWelcomeNavbarHidden, WelcomeExperience } from "./WelcomeExperience";

const baseProps = {
  onStart: vi.fn(),
  onNavigate: vi.fn(),
  onAccountDetails: vi.fn(),
  onLogin: vi.fn(),
  onSignup: vi.fn(),
  onLogout: vi.fn(),
  authenticated: true,
  loading: false,
  userName: "Mira Ahmed",
  theme: "dark" as const,
  onToggleTheme: vi.fn(),
};

describe("WelcomeExperience account trigger", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it("renders only initials in the trigger when no persisted profile image is available", () => {
    const markup = renderToStaticMarkup(<WelcomeExperience {...baseProps} />);

    expect(markup).toContain('aria-label="Open account menu for Mira Ahmed"');
    expect(markup).toContain('<span class="ct-profile-avatar">MA</span>');
    expect(markup).not.toContain("Secure workspace");
    expect(markup).not.toContain("ct-profile-copy");
    expect(markup).toContain("ct-home-utilities");
    expect(markup).toContain("Private practice");
    expect(markup).not.toContain("ct-motion-switch");
    expect(markup).toContain("ct-theme-switch-state");
  });

  it("can suppress the bespoke welcome navbar when the shared authenticated shell is active", () => {
    const markup = renderToStaticMarkup(<WelcomeExperience {...baseProps} showNavbar={false} />);

    expect(markup).not.toContain("ct-welcome-bar");
    expect(markup).toContain("Make the first answer feel");
  });

  it("uses the Ember Halo treatment for the public navbar while retaining the welcome navigation landmark", () => {
    const markup = renderToStaticMarkup(<WelcomeExperience {...baseProps} />);

    expect(markup).toContain("ct-welcome-bar--ember-halo");
    expect(markup).toContain('aria-label="Welcome page navigation"');
  });

  it("renders a supplied profile image instead of initials", () => {
    const markup = renderToStaticMarkup(
      <WelcomeExperience {...baseProps} profileImageUrl="https://cdn.example.com/mira.jpg" />,
    );

    expect(markup).toContain('src="https://cdn.example.com/mira.jpg"');
    expect(markup).toContain('alt=""');
  });

  it("keeps the refined profile trigger as a labelled menu button with an avatar", async () => {
    const user = userEvent.setup();
    render(<WelcomeExperience {...baseProps} />);

    const trigger = screen.getByRole("button", { name: "Open account menu for Mira Ahmed" });
    expect(trigger.className).toContain("ct-profile-button");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.querySelector(".ct-profile-avatar")).not.toBeNull();

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(document.querySelector(".ct-profile-popover[role='menu']")).not.toBeNull();
      expect(screen.getByRole("menuitem", { name: /Account details/i })).not.toBeNull();
      expect(screen.getByRole("menuitem", { name: /Sign out/i })).not.toBeNull();
      expect(screen.queryByRole("menuitem", { name: /Open practice plan/i })).toBeNull();
    });
  });

  it("opens the authenticated dropdown and routes its Account details action to /account", async () => {
    const user = userEvent.setup();
    render(
      <WelcomeExperience
        {...baseProps}
        onAccountDetails={() => window.history.pushState({}, "", "/account")}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open account menu for Mira Ahmed" }));
    await user.click(screen.getByRole("menuitem", { name: /Account details/i }));

    expect(window.location.pathname).toBe("/account");
    await waitFor(() => expect(screen.queryByRole("menuitem", { name: /Account details/i })).toBeNull());
  });

  it("keeps the refined desktop destinations as accessible anchor links", () => {
    render(<WelcomeExperience {...baseProps} />);

    expect(screen.getByRole("link", { name: "Experience" }).getAttribute("href")).toBe("#experience");
    expect(screen.getByRole("link", { name: "How it works" }).getAttribute("href")).toBe("#method");
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("#privacy");
  });

  it("keeps the outlined hero companion action linked to the three-step method", () => {
    render(<WelcomeExperience {...baseProps} />);

    const methodAction = screen.getByRole("link", { name: "See the three-step method" });
    expect(methodAction.getAttribute("href")).toBe("#method");
    expect(methodAction.className).toContain("ct-home-text-link");
  });

  it("retains the four welcome surfaces used by the coordinated dark-glass treatment", () => {
    const markup = renderToStaticMarkup(<WelcomeExperience {...baseProps} />);

    expect(markup).toContain("ct-welcome-preview");
    expect(markup).toContain("ct-welcome-corridor");
    expect(markup).toContain("ct-welcome-trust-card");
    expect(markup).toContain("ct-welcome-final");
    expect(markup).toContain("ct-welcome-preview ct-app-surface");
    expect(markup).toContain("ct-corridor-step ct-app-surface");
    expect(markup).toContain("ct-welcome-trust-card ct-welcome-trust-card--recreated ct-app-surface");
    expect(markup).toContain("ct-welcome-final ct-app-surface");
  });

  it("keeps the method steps inside one dedicated corridor surface for cohesive containment", () => {
    render(<WelcomeExperience {...baseProps} />);

    const corridor = document.querySelector(".ct-welcome-corridor");
    expect(corridor).not.toBeNull();
    expect(corridor?.querySelectorAll(".ct-corridor-step")).toHaveLength(3);
  });

  it("keeps the animated mobile trigger as a semantic disclosure control", async () => {
    const user = userEvent.setup();
    render(<WelcomeExperience {...baseProps} />);

    const menuButton = screen.getByRole("button", { name: "Open welcome page menu" });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(menuButton.querySelector(".ct-menu-icon-state .lucide-menu")).not.toBeNull();

    await user.click(menuButton);

    await waitFor(() => {
      expect(menuButton.getAttribute("aria-expanded")).toBe("true");
      expect(menuButton.querySelector(".ct-menu-icon-state .lucide-x")).not.toBeNull();
      expect(document.getElementById("ct-home-mobile-menu")).not.toBeNull();
    });
  });

  it("adds a dismissible focus backdrop when the welcome mobile menu opens", async () => {
    const user = userEvent.setup();
    render(<WelcomeExperience {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Open welcome page menu" }));
    expect(screen.getByRole("button", { name: "Close welcome page menu" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Close welcome page menu" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close welcome page menu" })).toBeNull());
  });

  it("hides only on sustained downward scroll and reveals on any meaningful upward scroll, including at page end", () => {
    expect(getWelcomeNavbarHidden(72, 64, false, false, false)).toBe(false);
    expect(getWelcomeNavbarHidden(110, 104, false, false, false)).toBeNull();
    expect(getWelcomeNavbarHidden(111, 104, false, false, false)).toBe(true);
    expect(getWelcomeNavbarHidden(107, 111, false, false, false)).toBe(false);
    expect(getWelcomeNavbarHidden(232, 216, false, false, false)).toBe(true);
    expect(getWelcomeNavbarHidden(9_842, 9_858, false, false, false)).toBe(false);
    expect(getWelcomeNavbarHidden(9_860, 9_852, false, false, false, true)).toBe(false);
    expect(getWelcomeNavbarHidden(260, 252, true, false, false)).toBe(false);
    expect(getWelcomeNavbarHidden(260, 252, false, true, false)).toBe(false);
  });

  it("updates the rendered homepage navbar from native downward and upward scroll events", async () => {
    render(<WelcomeExperience {...baseProps} />);
    const navbar = document.querySelector(".ct-welcome-bar");

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 220 });
    fireEvent.scroll(window);
    await waitFor(() => expect(navbar?.getAttribute("data-hidden")).toBe("true"));

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 206 });
    fireEvent.scroll(window);
    await waitFor(() => expect(navbar?.getAttribute("data-hidden")).toBe("false"));
  });

  it("reappears from the page bottom after a slight upward scroll using the shared Account threshold", async () => {
    render(<WelcomeExperience {...baseProps} />);
    const navbar = document.querySelector(".ct-welcome-bar");

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 9_860 });
    fireEvent.scroll(window);
    await waitFor(() => expect(navbar?.getAttribute("data-hidden")).toBe("true"));

    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 9_856 });
    fireEvent.scroll(window);
    await waitFor(() => expect(navbar?.getAttribute("data-hidden")).toBe("false"));
  });

  it("retains a labelled, animated theme switch in the navbar", async () => {
    const user = userEvent.setup();
    function StatefulThemeHarness() {
      const [theme, setTheme] = React.useState<"dark" | "light">("dark");
      return <WelcomeExperience {...baseProps} theme={theme} onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} />;
    }
    render(<StatefulThemeHarness />);

    const switchControl = screen.getByRole("switch", { name: "Switch to light mode" });
    expect(switchControl.getAttribute("aria-checked")).toBe("true");
    expect(switchControl.querySelector(".ct-theme-switch-state .lucide-moon")).not.toBeNull();
    await user.click(switchControl);

    await waitFor(() => {
      const updatedControl = screen.getByRole("switch", { name: "Switch to dark mode" });
      expect(updatedControl.getAttribute("aria-checked")).toBe("false");
      expect(updatedControl.querySelector(".ct-theme-switch-state .lucide-sun")).not.toBeNull();
    });
  });
});
