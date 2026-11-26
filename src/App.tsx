import { useEffect, useMemo, useState } from 'react';
import { deleteUser, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ArrowUpRight, Download, X } from 'lucide-react';
import { auth, verifyServerAdmin } from './lib/firebase';
import { SAMPLE_SHOWCASE_APPS } from './data/defaults';
import { GitHubAsset, GitHubReleaseInfo, ShowcaseApp } from './types/app';
import { subscribeToApps } from './services/firestore';
import {
  fetchAutoSyncedGitHubApps,
  fetchGitHubReleaseInfo,
  resolveDirectDownload,
  triggerDirectDownload,
} from './services/github';
import { Header } from './components/Header';
import { AppCover } from './components/AppCover';
import { AppDetailModal } from './components/AppDetailModal';
import { AdminDrawer } from './components/AdminDrawer';

const STUDIO_NAME = 'Apps by Rimon';
const RIMON_WEBSITE_URL = 'https://rimon-profile.vercel.app';
const RIMON_GITHUB_HANDLE = 'RimonTimon';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [firestoreApps, setFirestoreApps] = useState<ShowcaseApp[]>([]);
  const [autoSyncedApps, setAutoSyncedApps] = useState<ShowcaseApp[]>([]);
  const [releases, setReleases] = useState<Record<string, GitHubReleaseInfo>>({});

  const [selectedApp, setSelectedApp] = useState<ShowcaseApp | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Server-verified single-owner auth guard (zero admin email stored in client code)
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      const verified = await verifyServerAdmin();
      if (!active) return;

      if (!verified) {
        deleteUser(currentUser)
          .catch(() => signOut(auth))
          .catch(() => {});
        setUser(null);
        setIsAdmin(false);
      } else {
        setUser(currentUser);
        setIsAdmin(true);
      }
      setAuthReady(true);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Subscribe to published apps from Firestore
  useEffect(() => {
    if (!authReady) return;
    const unsub = subscribeToApps(
      isAdmin,
      (items) => setFirestoreApps(items),
      () => {}
    );
    return () => unsub();
  }, [authReady, isAdmin]);

  // Automatically discover public GitHub Releases under RimonTimon
  useEffect(() => {
    let cancelled = false;
    fetchAutoSyncedGitHubApps(RIMON_GITHUB_HANDLE).then(({ apps, releases: rels }) => {
      if (cancelled) return;
      setAutoSyncedApps(apps);
      if (Object.keys(rels).length > 0) {
        setReleases((prev) => ({ ...prev, ...rels }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Combine Firestore apps + auto-synced GitHub releases (fall back to previews if empty)
  const visibleApps = useMemo(() => {
    const publishedDb = firestoreApps.filter((a) => a.isPublished);
    const seenRepos = new Set<string>();
    const combined: ShowcaseApp[] = [];

    for (const app of publishedDb) {
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

    return combined.length > 0 ? combined : SAMPLE_SHOWCASE_APPS;
  }, [firestoreApps, autoSyncedApps]);

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

  const githubProfileUrl = `https://github.com/${RIMON_GITHUB_HANDLE}`;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F5F5F7] text-zinc-900">
      <Header
        studioName={STUDIO_NAME}
        githubUrl={githubProfileUrl}
        websiteUrl={RIMON_WEBSITE_URL}
      />

      {/* Borderless Modern App Cards — Compact Round Icons */}
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
              href={RIMON_WEBSITE_URL}
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
              <span>github.com/{RIMON_GITHUB_HANDLE}</span>
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

      {/* Restricted Owner-Only Manage Drawer */}
      <AdminDrawer
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        user={user}
        isAdmin={isAdmin}
        apps={firestoreApps}
        onAdminVerified={setIsAdmin}
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
