import { useEffect } from 'react';
import { ArrowUpRight, Check, Download, X } from 'lucide-react';
import { GitHubAsset, GitHubReleaseInfo, Language, ShowcaseApp } from '../types/app';
import { COPY } from '../data/i18n';
import { AppCover } from './AppCover';
import { resolveDirectDownload } from '../services/github';

interface AppDetailModalProps {
  app: ShowcaseApp | null;
  release?: GitHubReleaseInfo | null;
  lang: Language;
  onClose: () => void;
  onDownload: (app: ShowcaseApp, customAsset?: GitHubAsset) => void;
}

export function AppDetailModal({
  app,
  release,
  lang,
  onClose,
  onDownload,
}: AppDetailModalProps) {
  const t = COPY[lang].modal;

  useEffect(() => {
    if (!app) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [app, onClose]);

  if (!app) return null;

  const resolved = resolveDirectDownload(app, release);
  const displayVersion = release?.tagName || app.version;
  const displaySize = resolved.sizeLabel || app.fileSize;
  const repoUrl = `https://github.com/${app.githubRepo}`;
  const publishedDate = release?.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 space-y-7">
          {/* Header Row with Round Icon + Close */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 shrink-0 shadow-xs">
                <AppCover
                  src={app.coverImage}
                  alt={`${app.name} icon`}
                  title={app.name}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h2
                  id="app-detail-title"
                  className="font-display text-2xl font-bold tracking-tight text-zinc-900 truncate"
                >
                  {app.name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400 font-mono tabular-nums">
                  <span>{displayVersion}</span>
                  {displaySize && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{displaySize}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{app.platform}</span>
                  {publishedDate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{publishedDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onDownload(app)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-blue-600 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t.directDownload}</span>
            </button>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/70 rounded-full transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.viewOnGithub}</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base leading-relaxed text-zinc-600 whitespace-pre-line">
            {app.description}
          </p>

          {/* Highlights */}
          {app.highlights.length > 0 && (
            <div className="bg-[#F5F5F7] rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 mb-3">
                {t.highlights}
              </h3>
              <ul className="space-y-2">
                {app.highlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-zinc-700 leading-relaxed"
                  >
                    <Check
                      className="w-4 h-4 mt-0.5 text-blue-600 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All GitHub Assets */}
          {release && release.assets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-3">
                {t.allAssets}
              </h3>
              <div className="space-y-2">
                {release.assets.slice(0, 8).map((asset) => (
                  <div
                    key={asset.name}
                    className="px-4 py-3 rounded-2xl bg-[#F5F5F7] flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-mono text-zinc-800 truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono tabular-nums mt-0.5">
                        {asset.sizeFormatted}
                        {asset.downloadCount > 0 && (
                          <>
                            {' · '}
                            {asset.downloadCount.toLocaleString()} {t.downloads}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDownload(app, asset)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-900 bg-white hover:bg-blue-600 hover:text-white rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Release Notes */}
          {release?.body?.trim() && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 mb-3">
                {t.releaseNotes}
              </h3>
              <div className="text-xs sm:text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap font-mono bg-[#F5F5F7] rounded-2xl p-4 max-h-48 overflow-y-auto">
                {release.body.slice(0, 1600)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
