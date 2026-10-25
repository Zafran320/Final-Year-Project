import { afterEach, describe, expect, it, vi } from "vitest";
import { clearGitHubMetadataCacheForTests, getGitHubRepositoryMetadata, getGitHubRepositoryMetadataForLinks, githubRepositoryFromLink } from "./github";

describe("GitHub repository metadata", () => {
  afterEach(() => {
    clearGitHubMetadataCacheForTests();
    vi.restoreAllMocks();
  });

  it("accepts only canonical GitHub owner/repository links", () => {
    expect(githubRepositoryFromLink("github.com/openai/openai-node")).toMatchObject({ key: "openai/openai-node" });
    expect(githubRepositoryFromLink("https://gitlab.com/openai/openai-node")).toBeNull();
    expect(githubRepositoryFromLink("https://github.com/openai")).toBeNull();
  });

  it("returns stars and forks from the public REST response and reuses a cached result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ full_name: "openai/openai-node", html_url: "https://github.com/openai/openai-node", stargazers_count: 42, forks_count: 7 }), { status: 200 }));

    const first = await getGitHubRepositoryMetadata("https://github.com/openai/openai-node");
    const second = await getGitHubRepositoryMetadata("github.com/openai/openai-node");

    expect(first).toMatchObject({ repository: "openai/openai-node", stars: 42, forks: 7 });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/repos/openai/openai-node");
  });

  it("returns no metadata for invalid or unavailable repositories", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));
    await expect(getGitHubRepositoryMetadata("https://github.com/openai/missing")).resolves.toBeNull();
    await expect(getGitHubRepositoryMetadata("https://example.com/openai/missing")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retrieves a bounded batch of eligible repository links while skipping invalid links", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ full_name: "openai/openai-node", html_url: "https://github.com/openai/openai-node", stargazers_count: 10, forks_count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ full_name: "facebook/react", html_url: "https://github.com/facebook/react", stargazers_count: 20, forks_count: 3 }), { status: 200 }));

    const repositories = await getGitHubRepositoryMetadataForLinks(["https://github.com/openai/openai-node", "https://gitlab.com/openai/openai-node", "github.com/facebook/react"]);

    expect(repositories.map((repository) => repository.repository)).toEqual(["openai/openai-node", "facebook/react"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
