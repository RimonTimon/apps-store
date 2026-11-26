import { ShowcaseApp, StudioSettings } from '../types/app';

export const HERO_IMAGE_PATH = '/src/assets/images/hero_showcase_studio_1795665808320.jpg';

export const COVER_PRESETS = [
  {
    id: 'mobile',
    label: 'Minimal Mobile',
    path: '/src/assets/images/app_cover_mobile_1795665808074.jpg',
  },
  {
    id: 'desktop',
    label: 'Clean Workspace',
    path: '/src/assets/images/app_cover_desktop_1795665809960.jpg',
  },
  {
    id: 'utility',
    label: 'Glass & Aluminum',
    path: '/src/assets/images/app_cover_utility_1795665809021.jpg',
  },
  {
    id: 'sync',
    label: 'Modular Grid',
    path: '/src/assets/images/app_cover_sync_1795665809839.jpg',
  },
  {
    id: 'studio',
    label: 'Studio Desk',
    path: '/src/assets/images/hero_showcase_studio_1795665808320.jpg',
  },
] as const;

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studioName: 'Apps by Rimon',
  heroKicker: 'Independent Software Studio',
  heroHeadline: 'Thoughtfully crafted apps, ready in one click.',
  heroSubtext:
    'A focused collection of lightweight utilities and everyday apps. Every release downloads directly from GitHub with zero intermediaries or bloat.',
  githubUsername: 'RimonTimon',
  aboutText:
    'Every application featured here is built with clarity, speed, and longevity in mind. Releases are hosted transparently on GitHub so you always get the latest verified build in a single click.',
  contactUrl: 'https://rimon-profile.vercel.app',
};

// Initial real GitHub-backed sample showcase apps shown until you publish your own
export const SAMPLE_SHOWCASE_APPS: ShowcaseApp[] = [
  {
    id: 'sample-localsend',
    name: 'LocalSend',
    tagline: 'Share files securely with nearby devices over local Wi-Fi.',
    description:
      'A fast, open-source cross-platform tool for transferring photos, documents, and folders across Android, Windows, macOS, and Linux without internet or cloud accounts.',
    platform: 'Cross-Platform',
    category: 'Utility',
    githubRepo: 'localsend/localsend',
    directDownloadUrl: '',
    assetKeyword: '.apk',
    version: 'v1.17.0',
    fileSize: '28 MB',
    coverImage: '/src/assets/images/app_cover_mobile_1795665808074.jpg',
    highlights: [
      'Direct peer-to-peer local network transfers with HTTPS encryption',
      'No account creation, trackers, or external cloud servers required',
      'Native builds available for Android, Windows, macOS, and Linux',
    ],
    featured: true,
    isPublished: true,
    sortOrder: 1,
    ownerId: 'sample',
    isSample: true,
  },
  {
    id: 'sample-flow-launcher',
    name: 'Flow Launcher',
    tagline: 'Instant keyboard-driven launcher and file search for Windows.',
    description:
      'Launch apps, locate deep system files, run web queries, and automate daily developer tasks in milliseconds from a single minimal command bar.',
    platform: 'Windows',
    category: 'Productivity',
    githubRepo: 'Flow-Launcher/Flow.Launcher',
    directDownloadUrl: '',
    assetKeyword: '.exe',
    version: 'v1.19.5',
    fileSize: '54 MB',
    coverImage: '/src/assets/images/app_cover_desktop_1795665809960.jpg',
    highlights: [
      'Sub-millisecond fuzzy search across local files and installed apps',
      'Extensible plugin ecosystem for clipboard, calculator, and web tools',
      'Lightweight native footprint designed for distraction-free focus',
    ],
    featured: false,
    isPublished: true,
    sortOrder: 2,
    ownerId: 'sample',
    isSample: true,
  },
  {
    id: 'sample-drawio',
    name: 'Draw.io Desktop',
    tagline: 'Offline diagramming, architecture flows, and clean wireframes.',
    description:
      'Create system architecture diagrams, ER models, flowcharts, and clean UI sketches completely offline with local file privacy and crisp vector exports.',
    platform: 'Cross-Platform',
    category: 'Design Tools',
    githubRepo: 'jgraph/drawio-desktop',
    directDownloadUrl: '',
    assetKeyword: '.exe',
    version: 'v26.0.9',
    fileSize: '96 MB',
    coverImage: '/src/assets/images/app_cover_utility_1795665809021.jpg',
    highlights: [
      '100% offline local storage with zero telemetry or cloud lock-in',
      'Export crisp SVG, PNG, and PDF files for documentation and slides',
      'Rich library of architecture, network, and wireframe stencils',
    ],
    featured: false,
    isPublished: true,
    sortOrder: 3,
    ownerId: 'sample',
    isSample: true,
  },
  {
    id: 'sample-ente-auth',
    name: 'Ente Auth',
    tagline: 'End-to-end encrypted two-factor authenticator for every device.',
    description:
      'Keep your 2FA codes safely backed up with zero-knowledge encryption, instant search, offline support, and clean cross-device sync.',
    platform: 'Android',
    category: 'Security',
    githubRepo: 'ente-io/ente',
    directDownloadUrl: '',
    assetKeyword: '.apk',
    version: 'v4.3.2',
    fileSize: '32 MB',
    coverImage: '/src/assets/images/app_cover_sync_1795665809839.jpg',
    highlights: [
      'Audited end-to-end encryption with offline-first code generation',
      'One-tap copy with clean next-code preview and smart tagging',
      'Open-source releases published directly through GitHub Releases',
    ],
    featured: false,
    isPublished: true,
    sortOrder: 4,
    ownerId: 'sample',
    isSample: true,
  },
];
