export type PlatformType =
  | 'Android'
  | 'Windows'
  | 'macOS'
  | 'Linux'
  | 'Cross-Platform'
  | 'Web';

export const PLATFORMS: PlatformType[] = [
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'Cross-Platform',
  'Web',
];

export type Language = 'en' | 'bn';

export interface ShowcaseApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  platform: PlatformType;
  category: string;
  githubRepo: string;
  directDownloadUrl: string;
  assetKeyword: string;
  version: string;
  fileSize: string;
  coverImage: string;
  highlights: string[];
  featured: boolean;
  isPublished: boolean;
  sortOrder: number;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  isSample?: boolean;
}

export interface StudioSettings {
  studioName: string;
  heroKicker: string;
  heroHeadline: string;
  heroSubtext: string;
  githubUsername: string;
  aboutText: string;
  contactUrl: string;
  ownerId?: string;
  updatedAt?: unknown;
}

export interface GitHubAsset {
  name: string;
  browserDownloadUrl: string;
  size: number;
  sizeFormatted: string;
  downloadCount: number;
  contentType: string;
}

export interface GitHubReleaseInfo {
  repo: string;
  tagName: string;
  releaseName: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  stars: number;
  defaultBranch: string;
  assets: GitHubAsset[];
  primaryAsset: GitHubAsset | null;
  fallbackZipUrl: string;
}

export interface GitHubRepoSummary {
  fullName: string;
  name: string;
  description: string;
  stars: number;
  language: string | null;
  updatedAt: string;
  htmlUrl: string;
  defaultBranch: string;
}

// Verbatim validation bounds synced with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  app: {
    nameMax: 80,
    taglineMax: 160,
    descriptionMax: 2000,
    categoryMax: 40,
    githubRepoMax: 120,
    githubRepoPattern: /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
    directDownloadUrlMax: 500,
    assetKeywordMax: 40,
    versionMax: 32,
    fileSizeMax: 32,
    coverImageMax: 500,
    highlightsMaxCount: 6,
    highlightItemMax: 120,
  },
  settings: {
    studioNameMax: 60,
    heroKickerMax: 60,
    heroHeadlineMax: 140,
    heroSubtextMax: 320,
    githubUsernameMax: 60,
    aboutTextMax: 1200,
    contactUrlMax: 200,
  },
} as const;
