export type GitHubRepositoryMetadata = {
  sourceLink: string;
  repository: string;
  htmlUrl: string;
  stars: number;
  forks: number;
};

type CacheEntry = { value: GitHubRepositoryMetadata | null; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<GitHubRepositoryMetadata | null>>();
const cacheTtlMs = 30 * 60 * 1_000;

export function githubRepositoryFromLink(link: string) {
  const value = link.trim();
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(normalized);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;
    const [owner = "", rawRepository = ""] = url.pathname.split("/").filter(Boolean);
    const repository = rawRepository.replace(/\.git$/i, "");
    if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) return null;
    return { sourceLink: url.toString(), owner, repository, key: `${owner}/${repository}` };
  } catch {
    return null;
  }
}

async function requestRepositoryMetadata(sourceLink: string, owner: string, repository: string): Promise<GitHubRepositoryMetadata | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "FutureMaker-AI",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { stargazers_count?: unknown; forks_count?: unknown; html_url?: unknown; full_name?: unknown };
    const stars = Number(payload.stargazers_count);
    const forks = Number(payload.forks_count);
    if (!Number.isInteger(stars) || stars < 0 || !Number.isInteger(forks) || forks < 0) return null;
    return {
      sourceLink,
      repository: typeof payload.full_name === "string" ? payload.full_name : `${owner}/${repository}`,
      htmlUrl: typeof payload.html_url === "string" ? payload.html_url : `https://github.com/${owner}/${repository}`,
      stars,
      forks,
    };
  } catch {
    return null;
  }
}

export async function getGitHubRepositoryMetadata(link: string) {
  const parsed = githubRepositoryFromLink(link);
  if (!parsed) return null;
  const current = cache.get(parsed.key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const active = pending.get(parsed.key);
  if (active) return active;
  const request = requestRepositoryMetadata(parsed.sourceLink, parsed.owner, parsed.repository).then((value) => {
    cache.set(parsed.key, { value, expiresAt: Date.now() + cacheTtlMs });
    pending.delete(parsed.key);
    return value;
  }).catch(() => {
    pending.delete(parsed.key);
    return null;
  });
  pending.set(parsed.key, request);
  return request;
}

export async function getGitHubRepositoryMetadataForLinks(links: string[]) {
  const uniqueLinks = Array.from(new Set(links.map((link) => link.trim()).filter(Boolean))).slice(0, 8);
  const repositories: GitHubRepositoryMetadata[] = [];
  for (const link of uniqueLinks) {
    const repository = await getGitHubRepositoryMetadata(link);
    if (repository) repositories.push(repository);
  }
  return repositories;
}

export function clearGitHubMetadataCacheForTests() {
  cache.clear();
  pending.clear();
}
