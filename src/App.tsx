import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Download, X } from 'lucide-react';
import { GitHubAsset, GitHubReleaseInfo, ShowcaseApp } from './types/app';
import {
  fetchAutoSyncedGitHubApps,
  fetchGitHubReleaseInfo,
  resolveDirectDownload,
  triggerDirectDownload,
} from './services/github';
import {
  clearLocalDraftConfig,
  DEFAULT_CONFIG,
  loadShowcaseConfig,
  saveLocalDraftConfig,
  ShowcaseConfig,
} from './services/storage';
import { Header } from './components/Header';
import { AppCover } from './components/AppCover';
import { AppDetailModal } from './components/AppDetailModal';
import { AdminDrawer } from './components/AdminDrawer';

export default function App() {
  const [config, setConfig] = useState<ShowcaseConfig>(DEFAULT_CONFIG);
  const [hasLocalOverrides, setHasLocalOverrides] = useState(false);
  const [autoSyncedApps, setAutoSyncedApps] = useState<ShowcaseApp[]>([]);
  const [releases, setReleases] = useState<Record<string, GitHubReleaseInfo>>({});

  const [selectedApp, setSelectedApp] = useState<ShowcaseApp | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load zero-config public/apps.json (or local draft)
  useEffect(() => {
    let active = true;
    loadShowcaseConfig().then(({ config: loaded, hasLocalOverrides: local }) => {
      if (!active) return;
      setConfig(loaded);
      setHasLocalOverrides(local);
    });
    return () => {
      active = false;
    };
  }, []);

  // Automatically discover public GitHub Releases under githubUsername (RimonTimon) — zero API keys needed
  useEffect(() => {
    if (!config.autoSyncGithubReleases || !config.githubUsername) {
      setAutoSyncedApps([]);
      return;
    }

    let cancelled = false;
    fetchAutoSyncedGitHubApps(config.githubUsername).then(({ apps, releases: rels }) => {
      if (cancelled) return;
      setAutoSyncedApps(apps);
      if (Object.keys(rels).length > 0) {
        setReleases((prev) => ({ ...prev, ...rels }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [config.autoSyncGithubReleases, config.githubUsername]);

  // Combine curated apps and auto-synced GitHub releases seamlessly
  const visibleApps = useMemo(() => {
    const publishedCustom = config.apps.filter((a) => a.isPublished);
    const nonSampleCustom = publishedCustom.filter((a) => !a.isSample);

    // Build deduplicated list prioritizing user's curated apps + auto-synced GitHub repos
    const seenRepos = new Set<string>();
    const combined: ShowcaseApp[] = [];

    for (const app of nonSampleCustom) {
      seenRepos.add(app.githubRepo.toLowerCase());
      combined.push(app);
    }

    for (const ghApp of autoSyncedApps) {
      const key = ghApp.githubRepo.toLowerCase();
      if (!seenRepos.has(key)) {
        seenRepos.add(key);
        combined.push(ghApp);
      }
    }

    // If user hasn't added custom apps and has no GitHub Releases yet, display sample showcase apps
    if (combined.length > 0) {
      return combined;
    }
    return publishedCustom;
  }, [config.apps, autoSyncedApps]);

  // Resolve live GitHub Release binaries for direct one-click downloads
  useEffect(() => {
    let cancelled = false;

    async function syncReleases() {
      const entries = await Promise.all(
        visibleApps.map(async (app) => {
          const info = await fetchGitHubReleaseInfo(
            app.githubRepo,
            app.platform,
            app.assetKeyword
          );
          return [app.id, info] as const;
        })
      );

      if (cancelled) return;
      setReleases((prev) => {
        const next = { ...prev };
        for (const [id, info] of entries) {
          if (info) next[id] = info;
        }
        return next;
      });
    }

    if (visibleApps.length > 0) {
      syncReleases();
    }

    return () => {
      cancelled = true;
    };
  }, [visibleApps]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleUpdateConfig = (next: ShowcaseConfig) => {
    setConfig(next);
    setHasLocalOverrides(true);
    saveLocalDraftConfig(next);
  };

  const handleResetOverrides = async () => {
    clearLocalDraftConfig();
    const { config: fresh } = await loadShowcaseConfig();
    setConfig(fresh);
    setHasLocalOverrides(false);
    setToast('Restored apps.json defaults.');
  };

  const handleDirectDownload = (app: ShowcaseApp, customAsset?: GitHubAsset) => {
    setDownloadingId(app.id);
    const rel = releases[app.id];
    const resolved = resolveDirectDownload(app, rel);
    const targetUrl = customAsset ? customAsset.browserDownloadUrl : resolved.url;
    const fileName = customAsset ? customAsset.name : resolved.fileName;

    triggerDirectDownload(targetUrl, fileName);
    setToast(`Downloading ${fileName}`);

    window.setTimeout(() => {
      setDownloadingId((prev) => (prev === app.id ? null : prev));
    }, 850);
  };

  const githubUsername = config.githubUsername || 'RimonTimon';
  const githubProfileUrl = `https://github.com/${githubUsername}`;
  const websiteUrl = config.websiteUrl || 'https://rimon-profile.vercel.app';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F5F5F7] text-zinc-900">
      <Header
        studioName={config.studioName}
        githubUrl={githubProfileUrl}
        websiteUrl={websiteUrl}
      />

      {/* Borderless Modern App Cards — Compact Round Icons, Zero Clutter */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-16 sm:pb-24">
        <section aria-label="Applications">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {visibleApps.map((app) => {
              const rel = releases[app.id];
              const resolved = resolveDirectDownload(app, rel);
              const versionText = rel?.tagName || app.version;
              const sizeText = resolved.sizeLabel || app.fileSize;

              return (
                <article
                  key={app.id}
                  className="group flex flex-col justify-between gap-5 p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-shadow duration-200"
                >
                  {/* Top Row: Standard Round Icon + Name + Short Details */}
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      aria-label={`View ${app.name} details`}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-zinc-100 shrink-0 cursor-pointer transition-transform duration-200 group-hover:scale-[1.03]"
                    >
                      <AppCover
                        src={app.coverImage}
                        alt={`${app.name} icon`}
                        title={app.name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 truncate">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="text-left hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {app.name}
                        </button>
                      </h2>

                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-mono text-zinc-400 tabular-nums truncate">
                        <span>{versionText}</span>
                        {sizeText && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{sizeText}</span>
                          </>
                        )}
                      </div>

                      <p className="mt-2.5 text-sm leading-relaxed text-zinc-500 line-clamp-2">
                        {app.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Clean One-Click Download + Subtle Details */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDirectDownload(app)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-zinc-900 hover:bg-blue-600 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {downloadingId === app.id ? 'Downloading...' : 'Download'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <span>Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* Borderless Quiet Footer */}
      <footer className="mt-auto">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-zinc-400">
          <p className="font-medium text-zinc-600">Apps by Rimon</p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <span>rimon-profile.vercel.app</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
            </a>
            <a
              href={githubProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <span>github.com/{githubUsername}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>
      </footer>

      {/* App Detail Modal */}
      <AppDetailModal
        app={selectedApp}
        release={selectedApp ? releases[selectedApp.id] : null}
        lang="en"
        onClose={() => setSelectedApp(null)}
        onDownload={handleDirectDownload}
      />

      {/* Zero-Config App Manager Drawer */}
      <AdminDrawer
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        config={config}
        hasLocalOverrides={hasLocalOverrides}
        onUpdateConfig={handleUpdateConfig}
        onResetOverrides={handleResetOverrides}
        onNotify={(msg) => setToast(msg)}
      />

      {/* Minimal Download Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 left-5 sm:left-auto z-50 sm:max-w-sm px-4 py-3 text-xs font-medium text-white bg-zinc-900 rounded-2xl shadow-lg flex items-center justify-between gap-3"
        >
          <span className="truncate">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
