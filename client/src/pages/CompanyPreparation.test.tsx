// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  profileData: null as Record<string, string> | null,
}));

vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark" }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    careerProfile: { get: { useQuery: () => ({ data: mocks.profileData, isLoading: false }) } },
    practicePreparation: { analyze: { useMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false, reset: mocks.reset }) } },
  },
}));

import CompanyPreparation from "./CompanyPreparation";

const componentProps = { onContinue: vi.fn() };

describe("CompanyPreparation workspace", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.reset.mockReset();
    componentProps.onContinue.mockReset();
    mocks.profileData = null;
  });

  it("renders the company-first preparation contract and privacy boundary", () => {
    const markup = renderToStaticMarkup(<CompanyPreparation {...componentProps} />);

    expect(markup).toContain("Company preparation");
    expect(markup).toContain("Selected sources only");
    expect(markup).toContain("Company website");
    expect(markup).toContain("Target role");
    expect(markup).toContain("Upload supporting evidence");
    expect(markup).toContain("Account context stays private");
    expect(markup).toContain("Illustrative connectors stay excluded");
    expect(markup).toContain("Nothing is saved in this milestone");
    expect(markup).toContain("Public links are fetched only when you add them");
    expect(markup).toContain("Illustrative connector snapshots are excluded");
    expect(markup).not.toContain("Back to practice");
  });

  it("requires company and role before starting analysis", () => {
    render(<CompanyPreparation {...componentProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Analyze company & role/i }));

    expect(screen.getByRole("alert").textContent).toContain("company name and target role");
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("requires selected source material before starting analysis", () => {
    render(<CompanyPreparation {...componentProps} />);
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: "Example Co" } });
    fireEvent.change(screen.getByLabelText(/Target role/i), { target: { value: "Frontend Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: /Analyze company & role/i }));

    expect(screen.getByRole("alert").textContent).toContain("Add a company website, role description, link, note, or supporting file");
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("adds and removes a public source without making a provider request", () => {
    render(<CompanyPreparation {...componentProps} />);
    const linkInput = screen.getByRole("textbox", { name: /Public source link/i });
    fireEvent.change(linkInput, { target: { value: "https://example.com/careers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add public source link" }));

    expect(screen.getByText("https://example.com/careers")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove https://example.com/careers" }));
    expect(screen.queryByText("https://example.com/careers")).toBeNull();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("accepts a bare public domain, previews its secure destination, and adds the normalized source", () => {
    render(<CompanyPreparation {...componentProps} />);
    const linkInput = screen.getByRole("textbox", { name: /Public source link/i });
    fireEvent.change(linkInput, { target: { value: "careers.example.com/role" } });
    fireEvent.blur(linkInput);

    expect(screen.getByText(/Secure destination:/).textContent).toContain("https://careers.example.com/role");
    fireEvent.click(screen.getByRole("button", { name: "Add public source link" }));
    expect(screen.getByText("https://careers.example.com/role")).not.toBeNull();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps unsafe or malformed public-source values out of the preparation set", () => {
    render(<CompanyPreparation {...componentProps} />);
    const linkInput = screen.getByRole("textbox", { name: /Public source link/i });
    fireEvent.change(linkInput, { target: { value: "http://localhost:3000/private" } });
    fireEvent.click(screen.getByRole("button", { name: "Add public source link" }));

    expect(screen.getByRole("alert").textContent).toContain("valid public domain or HTTP(S) URL");
    expect(screen.queryByText("http://localhost:3000/private")).toBeNull();
  });

  it("reports active workspace content and returns to an inactive state after clearing", async () => {
    const onActiveWorkChange = vi.fn();
    render(<CompanyPreparation {...componentProps} onActiveWorkChange={onActiveWorkChange} />);

    await waitFor(() => expect(onActiveWorkChange).toHaveBeenLastCalledWith(false));
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: "Example Co" } });
    await waitFor(() => expect(onActiveWorkChange).toHaveBeenLastCalledWith(true));

    fireEvent.click(screen.getByRole("button", { name: "Clear workspace" }));
    await waitFor(() => expect(onActiveWorkChange).toHaveBeenLastCalledWith(false));
  });

  it("includes available saved Account categories by default and sends only the enabled categories to Gemini", async () => {
    mocks.profileData = {
      careerField: "Software engineering",
      targetRole: "Frontend Engineer",
      location: "Lahore",
      skills: "React, TypeScript",
      professionalSummary: "Product-minded frontend developer.",
      education: "Bachelor's",
      projects: "[]",
    };
    mocks.mutateAsync.mockResolvedValue({
      brief: { companySummary: "A product company.", roleSummary: "A frontend role.", responsibilities: [], requiredSkills: [], preferredSkills: [], technologySignals: [], interviewThemes: [], workingStyleSignals: [], sourceAttributions: [], uncertaintyNotes: [] },
      sources: [{ label: "Role description", kind: "job-details", status: "analyzed", detail: "User-provided role details included." }],
      profileContextIncluded: true,
      accountContext: { includedCategoryIds: ["education", "skills-experience"], includedFieldCount: 3, connectorContextIncluded: false, persisted: false },
    });
    render(<CompanyPreparation {...componentProps} />);

    const careerToggle = await screen.findByRole("switch", { name: "Exclude Career direction in this analysis" });
    expect(careerToggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Illustrative connector snapshots are excluded/i)).not.toBeNull();
    fireEvent.click(careerToggle);
    expect(screen.getByRole("switch", { name: "Include Career direction in this analysis" }).getAttribute("aria-checked")).toBe("false");

    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: "Example Co" } });
    fireEvent.change(screen.getByLabelText(/Target role/i), { target: { value: "Frontend Engineer" } });
    fireEvent.change(screen.getByLabelText(/Role description/i), { target: { value: "Build accessible product interfaces." } });
    fireEvent.click(screen.getByRole("button", { name: /Analyze company & role/i }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalled());
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      profileCategoryIds: expect.arrayContaining(["education", "skills-experience"]),
    }));
    expect(mocks.mutateAsync.mock.calls[0][0].profileCategoryIds).not.toContain("career");
    await screen.findByRole("button", { name: /Continue to tailored questions/i });
    fireEvent.click(screen.getByRole("button", { name: /Continue to tailored questions/i }));
    expect(componentProps.onContinue).toHaveBeenCalledTimes(1);
  });
});
