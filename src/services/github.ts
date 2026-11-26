import {
  GitHubAsset,
  GitHubReleaseInfo,
  GitHubRepoSummary,
  PlatformType,
  ShowcaseApp,
} from '../types/app';

const CACHE_PREFIX = 'appshelf_gh_v1_';
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

const memoryCache = new Map<string, { data: GitHubReleaseInfo; ts: number }>();

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val >= 10 ? val.toFixed(1) : val.toFixed(2)} ${units[idx]}`;
}

export function parseGitHubRepoInput(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (urlMatch) {
    return `${urlMatch[1]}/${urlMatch[2]}`;
  }

  const slugMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slugMatch) {
    return `${slugMatch[1]}/${slugMatch[2]}`;
  }

  return null;
}

export function detectPlatformFromAssets(assets: GitHubAsset[]): PlatformType {
  const names = assets.map((a) => a.name.toLowerCase());
  const hasAndroid = names.some((n) => n.endsWith('.apk') || n.endsWith('.aab'));
  const hasWindows = names.some((n) => n.endsWith('.exe') || n.endsWith('.msi'));
  const hasMac = names.some((n) => n.endsWith('.dmg') || n.endsWith('.pkg'));
  const hasLinux = names.some((n) => n.endsWith('.appimage') || n.endsWith('.deb') || n.endsWith('.rpm'));

  const count = [hasAndroid, hasWindows, hasMac, hasLinux].filter(Boolean).length;
  if (count >= 2) return 'Cross-Platform';
  if (hasAndroid) return 'Android';
  if (hasWindows) return 'Windows';
  if (hasMac) return 'macOS';
  if (hasLinux) return 'Linux';
  return 'Cross-Platform';
}

export function pickBestAsset(
  assets: GitHubAsset[],
  platform: PlatformType,
  assetKeyword?: string
): GitHubAsset | null {
  if (!assets.length) return null;

  // Exclude checksums, signatures, and metadata files from primary binary match
  const downloadable = assets.filter(
    (a) =>
      !/\.(sha256|sha512|sig|asc|yml|yaml|txt|json|blockmap)$/i.test(a.name)
  );
  const pool = downloadable.length > 0 ? downloadable : assets;

  const keyword = (assetKeyword || '').trim().toLowerCase();
  if (keyword) {
    const keywordMatch = pool.find((a) => a.name.toLowerCase().includes(keyword));
    if (keywordMatch) return keywordMatch;
  }

  const platformExtensions: Record<PlatformType, string[]> = {
    Android: ['.apk', '.aab'],
    Windows: ['.exe', '.msi', '.msix', 'win', '.zip'],
    macOS: ['.dmg', '.pkg', 'mac', 'darwin', '.zip'],
    Linux: ['.appimage', '.deb', '.rpm', '.tar.gz', 'linux'],
    'Cross-Platform': ['.apk', '.exe', '.msi', '.dmg', '.appimage', '.zip'],
    Web: ['.zip', '.tar.gz'],
  };

  const prefs = platformExtensions[platform] || ['.apk', '.exe', '.dmg', '.zip'];
  for (const ext of prefs) {
    const match = pool.find((a) => a.name.toLowerCase().includes(ext));
    if (match) return match;
  }

  return pool[0] || null;
}

function readCache(repo: string): GitHubReleaseInfo | null {
  const mem = memoryCache.get(repo);
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) {
    return mem.data;
  }

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${repo}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: GitHubReleaseInfo; ts: number };
    if (Date.now() - parsed.ts < CACHE_TTL_MS) {
      memoryCache.set(repo, parsed);
      return parsed.data;
    }
  } catch {
    // Ignore storage read issues
  }
  return null;
}

function writeCache(repo: string, data: GitHubReleaseInfo): void {
  const entry = { data, ts: Date.now() };
  memoryCache.set(repo, entry);
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${repo}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota issues
  }
}

export async function fetchGitHubReleaseInfo(
  repo: string,
  platform: PlatformType = 'Cross-Platform',
  assetKeyword = '',
  forceRefresh = false
): Promise<GitHubReleaseInfo | null> {
  const cleanRepo = parseGitHubRepoInput(repo);
  if (!cleanRepo) return null;

  if (!forceRefresh) {
    const cached = readCache(cleanRepo);
    if (cached) {
      return {
        ...cached,
        primaryAsset: pickBestAsset(cached.assets, platform, assetKeyword),
      };
    }
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
    };

    const [repoRes, releaseRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${cleanRepo}`, { headers }),
      fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, { headers }),
    ]);

    if (!repoRes.ok && !releaseRes.ok) {
      return null;
    }

    const repoData = repoRes.ok ? await repoRes.json() : null;
    let releaseData = releaseRes.ok ? await releaseRes.json() : null;

    // If /releases/latest returns 404 (e.g. only pre-releases exist), try /releases?per_page=1
    if (!releaseData && repoRes.ok) {
      const listRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/releases?per_page=1`,
        { headers }
      );
      if (listRes.ok) {
        const list = await listRes.json();
        if (Array.isArray(list) && list.length > 0) {
          releaseData = list[0];
        }
      }
    }

    const defaultBranch = repoData?.default_branch || 'main';
    const rawAssets: Array<{
      name?: string;
      browser_download_url?: string;
      size?: number;
      download_count?: number;
      content_type?: string;
    }> = Array.isArray(releaseData?.assets) ? releaseData.assets : [];

    const assets: GitHubAsset[] = rawAssets
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({
        name: a.name || 'release-asset',
        browserDownloadUrl: a.browser_download_url || '',
        size: Number(a.size || 0),
        sizeFormatted: formatBytes(Number(a.size || 0)),
        downloadCount: Number(a.download_count || 0),
        contentType: a.content_type || 'application/octet-stream',
      }));

    const info: GitHubReleaseInfo = {
      repo: cleanRepo,
      tagName: releaseData?.tag_name || '',
      releaseName: releaseData?.name || releaseData?.tag_name || '',
      body: typeof releaseData?.body === 'string' ? releaseData.body : '',
      publishedAt: releaseData?.published_at || repoData?.pushed_at || '',
      htmlUrl: releaseData?.html_url || `https://github.com/${cleanRepo}`,
      stars: Number(repoData?.stargazers_count || 0),
      defaultBranch,
      assets,
      primaryAsset: pickBestAsset(assets, platform, assetKeyword),
      fallbackZipUrl: `https://github.com/${cleanRepo}/archive/refs/heads/${defaultBranch}.zip`,
    };

    writeCache(cleanRepo, info);
    return info;
  } catch {
    return null;
  }
}

export async function fetchGitHubRepoAutofill(repoInput: string): Promise<{
  repo: string;
  name: string;
  tagline: string;
  description: string;
  platform: PlatformType;
  version: string;
  fileSize: string;
  directDownloadUrl: string;
  assetKeyword: string;
  releaseInfo: GitHubReleaseInfo | null;
} | null> {
  const cleanRepo = parseGitHubRepoInput(repoInput);
  if (!cleanRepo) return null;

  const headers: HeadersInit = { Accept: 'application/vnd.github+json' };
  const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(
      repoRes.status === 404
        ? 'Repository not found on GitHub. Make sure it is public.'
        : `GitHub API returned status ${repoRes.status}.`
    );
  }
  const repoData = await repoRes.json();
  const releaseInfo = await fetchGitHubReleaseInfo(cleanRepo, 'Cross-Platform', '', true);
  const assets = releaseInfo?.assets || [];
  const platform = detectPlatformFromAssets(assets);
  const primary = pickBestAsset(assets, platform);

  const extMatch = primary?.name.match(/(\.[a-z0-9]+)$/i);
  const prettyName = (repoData.name || cleanRepo.split('/')[1] || 'My App')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const repoDesc =
    (typeof repoData.description === 'string' && repoData.description.trim()) ||
    `Download the latest release of ${prettyName} directly from GitHub.`;

  return {
    repo: cleanRepo,
    name: prettyName.slice(0, 80),
    tagline: repoDesc.slice(0, 160),
    description: repoDesc.slice(0, 2000),
    platform,
    version: releaseInfo?.tagName || 'v1.0.0',
    fileSize: primary?.sizeFormatted || '',
    directDownloadUrl: primary?.browserDownloadUrl || '',
    assetKeyword: extMatch ? extMatch[1].toLowerCase() : '',
    releaseInfo,
  };
}

export async function fetchUserGitHubRepos(username: string): Promise<GitHubRepoSummary[]> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) return [];

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=24`,
    { headers: { Accept: 'application/vnd.github+json' } }
  );

  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'GitHub user not found.'
        : `Could not load repositories (status ${res.status}).`
    );
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    fullName: item.full_name,
    name: item.name,
    description: item.description || '',
    stars: Number(item.stargazers_count || 0),
    language: item.language || null,
    updatedAt: item.updated_at || '',
    htmlUrl: item.html_url,
    defaultBranch: item.default_branch || 'main',
  }));
}

const AUTO_SYNC_CACHE_PREFIX = 'appshelf_autosync_v1_';

export async function fetchAutoSyncedGitHubApps(
  username: string
): Promise<{ apps: ShowcaseApp[]; releases: Record<string, GitHubReleaseInfo> }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) return { apps: [], releases: {} };

  try {
    const rawCached = sessionStorage.getItem(`${AUTO_SYNC_CACHE_PREFIX}${cleanUser}`);
    if (rawCached) {
      const parsed = JSON.parse(rawCached) as {
        ts: number;
        apps: ShowcaseApp[];
        releases: Record<string, GitHubReleaseInfo>;
      };
      if (Date.now() - parsed.ts < CACHE_TTL_MS) {
        return { apps: parsed.apps, releases: parsed.releases };
      }
    }
  } catch {
    // Ignore cache read error
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=15`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return { apps: [], releases: {} };

    const repos = await res.json();
    if (!Array.isArray(repos)) return { apps: [], releases: {} };

    const ownRepos = repos.filter((r) => !r.fork && !r.archived).slice(0, 10);
    const syncedApps: ShowcaseApp[] = [];
    const syncedReleases: Record<string, GitHubReleaseInfo> = {};

    await Promise.all(
      ownRepos.map(async (repo, idx) => {
        const fullName = String(repo.full_name || '');
        if (!fullName) return;

        const topics: string[] = Array.isArray(repo.topics)
          ? repo.topics.map((t: string) => String(t).toLowerCase())
          : [];
        const hasAppTopic =
          topics.includes('app') ||
          topics.includes('apps') ||
          topics.includes('showcase') ||
          topics.includes('release');

        const releaseInfo = await fetchGitHubReleaseInfo(fullName, 'Cross-Platform', '');
        const hasReleaseAssets = Boolean(releaseInfo && releaseInfo.assets.length > 0);
        const hasReleaseTag = Boolean(releaseInfo && releaseInfo.tagName);

        if (!hasReleaseAssets && !hasReleaseTag && !hasAppTopic) {
          return;
        }

        const platform = detectPlatformFromAssets(releaseInfo?.assets || []);
        const prettyName = String(repo.name || '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const id = `gh-${String(repo.id || idx)}`;
        const desc =
          (typeof repo.description === 'string' && repo.description.trim()) ||
          `Direct GitHub release of ${prettyName}.`;

        syncedApps.push({
          id,
          name: prettyName.slice(0, 80),
          tagline: desc.slice(0, 160),
          description: desc.slice(0, 2000),
          platform,
          category: repo.language || 'App',
          githubRepo: fullName,
          directDownloadUrl: releaseInfo?.primaryAsset?.browserDownloadUrl || '',
          assetKeyword: '',
          version: releaseInfo?.tagName || 'Latest',
          fileSize: releaseInfo?.primaryAsset?.sizeFormatted || '',
          coverImage: '',
          highlights: [],
          featured: idx === 0,
          isPublished: true,
          sortOrder: idx,
          ownerId: cleanUser,
        });

        if (releaseInfo) {
          syncedReleases[id] = releaseInfo;
        }
      })
    );

    syncedApps.sort((a, b) => a.sortOrder - b.sortOrder);

    try {
      sessionStorage.setItem(
        `${AUTO_SYNC_CACHE_PREFIX}${cleanUser}`,
        JSON.stringify({ ts: Date.now(), apps: syncedApps, releases: syncedReleases })
      );
    } catch {
      // Ignore quota errors
    }

    return { apps: syncedApps, releases: syncedReleases };
  } catch {
    return { apps: [], releases: {} };
  }
}

export function resolveDirectDownload(
  app: ShowcaseApp,
  release?: GitHubReleaseInfo | null
): { url: string; fileName: string; sizeLabel: string } {
  // 1. Live GitHub latest release binary takes priority when no manual override is pinned
  if (app.directDownloadUrl && app.directDownloadUrl.startsWith('https://')) {
    const tail = app.directDownloadUrl.split('/').pop() || `${app.name}-${app.version}`;
    return {
      url: app.directDownloadUrl,
      fileName: decodeURIComponent(tail),
      sizeLabel: app.fileSize || release?.primaryAsset?.sizeFormatted || '',
    };
  }

  if (release?.primaryAsset) {
    return {
      url: release.primaryAsset.browserDownloadUrl,
      fileName: release.primaryAsset.name,
      sizeLabel: release.primaryAsset.sizeFormatted || app.fileSize,
    };
  }

  // 2. Fallback to GitHub repository source zip download directly from GitHub
  const branch = release?.defaultBranch || 'main';
  return {
    url: `https://github.com/${app.githubRepo}/archive/refs/heads/${branch}.zip`,
    fileName: `${app.githubRepo.split('/')[1] || app.name}-${branch}.zip`,
    sizeLabel: app.fileSize || '',
  };
}

export function triggerDirectDownload(url: string, fileName?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (fileName) {
    link.download = fileName;
  }
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
