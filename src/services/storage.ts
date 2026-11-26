import { PLATFORMS, PlatformType, ShowcaseApp } from '../types/app';
import { SAMPLE_SHOWCASE_APPS } from '../data/defaults';

export interface ShowcaseConfig {
  studioName: string;
  githubUsername: string;
  websiteUrl: string;
  autoSyncGithubReleases: boolean;
  apps: ShowcaseApp[];
}

const LOCAL_STORAGE_KEY = 'apps_by_rimon_config_v1';

export const DEFAULT_CONFIG: ShowcaseConfig = {
  studioName: 'Apps by Rimon',
  githubUsername: 'RimonTimon',
  websiteUrl: 'https://rimon-profile.vercel.app',
  autoSyncGithubReleases: true,
  apps: SAMPLE_SHOWCASE_APPS,
};

function sanitizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('/src/assets/images/')) {
    return trimmed;
  }
  return '';
}

function normalizeApp(raw: Partial<ShowcaseApp>, idx: number): ShowcaseApp {
  const platform: PlatformType =
    raw.platform && PLATFORMS.includes(raw.platform)
      ? raw.platform
      : 'Cross-Platform';

  return {
    id: String(raw.id || `app-${idx + 1}`),
    name: String(raw.name || 'Untitled App').slice(0, 80),
    tagline: String(raw.tagline || '').slice(0, 160),
    description: String(raw.description || raw.tagline || '').slice(0, 2000),
    platform,
    category: String(raw.category || 'Utility').slice(0, 40),
    githubRepo: String(raw.githubRepo || '').trim(),
    directDownloadUrl: sanitizeUrl(String(raw.directDownloadUrl || '')),
    assetKeyword: String(raw.assetKeyword || '').slice(0, 40),
    version: String(raw.version || 'v1.0.0').slice(0, 32),
    fileSize: String(raw.fileSize || '').slice(0, 32),
    coverImage: sanitizeUrl(String(raw.coverImage || '')),
    highlights: Array.isArray(raw.highlights)
      ? raw.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 6)
      : [],
    featured: Boolean(raw.featured),
    isPublished: raw.isPublished !== false,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : idx + 1,
    ownerId: 'rimon',
    isSample: Boolean(raw.isSample),
  };
}

export function loadLocalDraftConfig(): ShowcaseConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShowcaseConfig>;
    return {
      studioName: String(parsed.studioName || DEFAULT_CONFIG.studioName),
      githubUsername: String(parsed.githubUsername || DEFAULT_CONFIG.githubUsername),
      websiteUrl: sanitizeUrl(String(parsed.websiteUrl || '')) || DEFAULT_CONFIG.websiteUrl,
      autoSyncGithubReleases: parsed.autoSyncGithubReleases !== false,
      apps: Array.isArray(parsed.apps)
        ? parsed.apps.map((a, i) => normalizeApp(a, i))
        : DEFAULT_CONFIG.apps,
    };
  } catch {
    return null;
  }
}

export function saveLocalDraftConfig(config: ShowcaseConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLocalDraftConfig(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function loadShowcaseConfig(): Promise<{
  config: ShowcaseConfig;
  hasLocalOverrides: boolean;
}> {
  const draft = loadLocalDraftConfig();
  if (draft) {
    return { config: draft, hasLocalOverrides: true };
  }

  try {
    const res = await fetch('/apps.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = (await res.json()) as Partial<ShowcaseConfig>;
      return {
        config: {
          studioName: String(parsed.studioName || DEFAULT_CONFIG.studioName),
          githubUsername: String(parsed.githubUsername || DEFAULT_CONFIG.githubUsername),
          websiteUrl: sanitizeUrl(String(parsed.websiteUrl || '')) || DEFAULT_CONFIG.websiteUrl,
          autoSyncGithubReleases: parsed.autoSyncGithubReleases !== false,
          apps: Array.isArray(parsed.apps)
            ? parsed.apps.map((a, i) => normalizeApp(a, i))
            : DEFAULT_CONFIG.apps,
        },
        hasLocalOverrides: false,
      };
    }
  } catch {
    // Fall back to built-in default config
  }

  return { config: DEFAULT_CONFIG, hasLocalOverrides: false };
}

export function serializeConfigForExport(config: ShowcaseConfig): string {
  const clean = {
    studioName: config.studioName,
    githubUsername: config.githubUsername,
    websiteUrl: config.websiteUrl,
    autoSyncGithubReleases: config.autoSyncGithubReleases,
    apps: config.apps.map(({ ownerId: _ownerId, ...rest }) => rest),
  };
  return JSON.stringify(clean, null, 2);
}

export function downloadAppsJsonFile(config: ShowcaseConfig): void {
  const content = serializeConfigForExport(config);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apps.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
