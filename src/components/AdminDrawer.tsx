import React, { useEffect, useState } from 'react';
import { deleteUser, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  ArrowUpRight,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  auth,
  FIREBASE_PROJECT_ID,
  googleProvider,
  verifyServerAdmin,
} from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  GitHubRepoSummary,
  PLATFORMS,
  PlatformType,
  ShowcaseApp,
} from '../types/app';
import { COVER_PRESETS } from '../data/defaults';
import {
  fetchGitHubRepoAutofill,
  fetchUserGitHubRepos,
  parseGitHubRepoInput,
} from '../services/github';
import {
  AppFormPayload,
  createShowcaseApp,
  deleteShowcaseApp,
  toggleShowcaseAppFlags,
  updateShowcaseApp,
} from '../services/firestore';

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  apps: ShowcaseApp[];
  onAdminVerified: (verified: boolean) => void;
  onNotify: (message: string) => void;
}

type AdminTab = 'form' | 'apps' | 'import';

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_MS = 30_000;

const EMPTY_FORM: AppFormPayload = {
  name: '',
  tagline: '',
  description: '',
  platform: 'Android',
  category: 'Utility',
  githubRepo: '',
  directDownloadUrl: '',
  assetKeyword: '.apk',
  version: 'v1.0.0',
  fileSize: '',
  coverImage: COVER_PRESETS[0].path,
  highlights: [],
  featured: false,
  isPublished: true,
  sortOrder: 0,
};

export function AdminDrawer({
  open,
  onClose,
  user,
  isAdmin,
  apps,
  onAdminVerified,
  onNotify,
}: AdminDrawerProps) {
  const [tab, setTab] = useState<AdminTab>('form');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppFormPayload>(EMPTY_FORM);
  const [highlightsText, setHighlightsText] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [fetchingGh, setFetchingGh] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fetchMessage, setFetchMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Auth & brute-force cooldown state (zero email exposure)
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  // GitHub profile import state
  const [ghUsernameInput, setGhUsernameInput] = useState('RimonTimon');
  const [importedRepos, setImportedRepos] = useState<GitHubRepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecondsLeft(remaining);
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  if (!open) return null;

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: apps.length + 1 });
    setHighlightsText('');
    setRepoInput('');
    setFormError('');
    setFetchMessage('');
  };

  const handleGoogleSignIn = async () => {
    if (Date.now() < cooldownUntil) return;

    setSigningIn(true);
    setAuthError('');
    setUnauthorizedDomainHost(null);

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const allowed = await verifyServerAdmin();

      if (!allowed) {
        try {
          await deleteUser(cred.user);
        } catch {
          await signOut(auth);
        }
        onAdminVerified(false);

        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= MAX_FAILED_ATTEMPTS) {
          setCooldownUntil(Date.now() + COOLDOWN_MS);
          setFailedAttempts(0);
          setAuthError('Access denied. Too many unauthorized attempts. Please wait 30 seconds.');
        } else {
          setAuthError('Access denied. This account does not have admin permission.');
        }
        return;
      }

      setFailedAttempts(0);
      onAdminVerified(true);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';

      if (code === 'auth/unauthorized-domain') {
        setUnauthorizedDomainHost(window.location.hostname);
        setAuthError(
          `This domain (${window.location.hostname}) is not authorized for Google Sign-In yet.`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was canceled.');
      } else {
        setAuthError('Sign-in could not be completed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onAdminVerified(false);
    setAuthError('');
  };

  const handleFetchFromGitHub = async (overrideRepo?: string) => {
    const raw = (overrideRepo ?? repoInput) || form.githubRepo;
    const parsed = parseGitHubRepoInput(raw);
    if (!parsed) {
      setFormError('Enter a valid GitHub repo like RimonTimon/app-name or full URL.');
      return;
    }

    setFetchingGh(true);
    setFormError('');
    setFetchMessage('');

    try {
      const result = await fetchGitHubRepoAutofill(parsed);
      if (!result) {
        setFormError('Could not read repository metadata from GitHub.');
        return;
      }

      setRepoInput(result.repo);
      setForm((prev) => ({
        ...prev,
        githubRepo: result.repo,
        name: prev.name && editingId ? prev.name : result.name,
        tagline: prev.tagline && editingId ? prev.tagline : result.tagline,
        description: prev.description && editingId ? prev.description : result.description,
        platform: result.platform,
        version: result.version,
        fileSize: result.fileSize,
        directDownloadUrl: result.directDownloadUrl,
        assetKeyword: result.assetKeyword,
      }));
      setFetchMessage('Loaded app info and direct download link from GitHub.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'GitHub request failed.');
    } finally {
      setFetchingGh(false);
    }
  };

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFormError('');

    const parsedRepo = parseGitHubRepoInput(repoInput || form.githubRepo);
    if (!parsedRepo) {
      setFormError('Please enter a valid GitHub repository (owner/repo).');
      return;
    }

    const highlights = highlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, BLUEPRINT_LIMITS.app.highlightsMaxCount);

    const payload: AppFormPayload = {
      ...form,
      githubRepo: parsedRepo,
      highlights,
      sortOrder: editingId ? form.sortOrder : apps.length + 1,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateShowcaseApp(editingId, payload);
        onNotify('App updated.');
      } else {
        await createShowcaseApp(payload);
        onNotify('App published.');
      }
      resetForm();
      setTab('apps');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save app.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (app: ShowcaseApp) => {
    setEditingId(app.id);
    setRepoInput(app.githubRepo);
    setForm({
      name: app.name,
      tagline: app.tagline,
      description: app.description,
      platform: app.platform,
      category: app.category,
      githubRepo: app.githubRepo,
      directDownloadUrl: app.directDownloadUrl,
      assetKeyword: app.assetKeyword,
      version: app.version,
      fileSize: app.fileSize,
      coverImage: app.coverImage || COVER_PRESETS[0].path,
      highlights: app.highlights,
      featured: app.featured,
      isPublished: app.isPublished,
      sortOrder: app.sortOrder,
    });
    setHighlightsText(app.highlights.join('\n'));
    setFormError('');
    setFetchMessage('');
    setTab('form');
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteShowcaseApp(id);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      onNotify('App deleted.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleTogglePublished = async (app: ShowcaseApp) => {
    if (!isAdmin) return;
    await toggleShowcaseAppFlags(app.id, {
      featured: app.featured,
      isPublished: !app.isPublished,
    });
  };

  const handleLoadUserRepos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghUsernameInput.trim()) return;
    setLoadingRepos(true);
    setImportError('');
    try {
      const repos = await fetchUserGitHubRepos(ghUsernameInput);
      setImportedRepos(repos);
      if (repos.length === 0) {
        setImportError('No public repositories found for this GitHub username.');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not fetch repositories.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSelectImportedRepo = async (fullName: string) => {
    resetForm();
    setRepoInput(fullName);
    setTab('form');
    await handleFetchFromGitHub(fullName);
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-[#F5F5F7] text-zinc-900 rounded-xl placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all';

  const labelClass = 'block text-xs font-medium text-zinc-500 mb-1.5';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/35 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Apps"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white flex flex-col overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 h-16 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900">
            Manage
          </h2>
          <div className="flex items-center gap-2">
            {user && isAdmin && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#F5F5F7] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Strict Server-Verified Admin Auth Gate (Zero Email Exposure) */}
        {!user || !isAdmin ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm w-full text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#F5F5F7] text-zinc-700 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-zinc-900">
                  Admin Access Only
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Restricted to the site owner. Unauthorized Google accounts are automatically blocked.
                </p>
              </div>

              {authError && (
                <div className="p-4 text-xs text-left leading-relaxed text-red-700 bg-red-50 rounded-2xl space-y-2.5">
                  <p className="font-medium">{authError}</p>
                  {unauthorizedDomainHost && (
                    <div className="pt-1 space-y-2 text-zinc-700">
                      <p>
                        Add <code className="font-mono font-semibold text-zinc-900">{unauthorizedDomainHost}</code> under{' '}
                        <strong>Authorized domains</strong> in Firebase Authentication settings:
                      </p>
                      <a
                        href={firebaseAuthSettingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                      >
                        <span>Open Firebase Auth Settings</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn || cooldownSecondsLeft > 0}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-zinc-900 hover:bg-blue-600 disabled:opacity-50 rounded-full transition-colors cursor-pointer"
              >
                {signingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {cooldownSecondsLeft > 0
                    ? `Try again in ${cooldownSecondsLeft}s`
                    : 'Continue with Google'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="px-6 pb-3 shrink-0">
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5F5F7] rounded-xl">
                {(
                  [
                    { id: 'form', label: editingId ? 'Edit App' : 'Add App' },
                    { id: 'apps', label: `My Apps (${apps.length})` },
                    { id: 'import', label: 'GitHub Import' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap truncate cursor-pointer ${
                      tab === item.id
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {tab === 'form' && (
                <form onSubmit={handleSubmitApp} className="space-y-4">
                  <div>
                    <label htmlFor="gh-repo-input" className={labelClass}>
                      GitHub Repository
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="gh-repo-input"
                        type="text"
                        value={repoInput}
                        onChange={(e) => {
                          setRepoInput(e.target.value);
                          setForm((prev) => ({ ...prev, githubRepo: e.target.value }));
                        }}
                        placeholder="RimonTimon/my-app or full GitHub URL"
                        className={inputClass}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchFromGitHub()}
                        disabled={fetchingGh}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-blue-600 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {fetchingGh ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{fetchingGh ? 'Fetching...' : 'Auto-Fill'}</span>
                      </button>
                    </div>
                    {fetchMessage && (
                      <p className="mt-1.5 text-xs text-emerald-600">{fetchMessage}</p>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="app-name" className={labelClass}>
                        App Name
                      </label>
                      <input
                        id="app-name"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.app.nameMax}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="app-platform" className={labelClass}>
                        Platform
                      </label>
                      <select
                        id="app-platform"
                        value={form.platform}
                        onChange={(e) =>
                          setForm({ ...form, platform: e.target.value as PlatformType })
                        }
                        className={inputClass}
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="app-tagline" className={labelClass}>
                      Short Details
                    </label>
                    <input
                      id="app-tagline"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.app.taglineMax}
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="app-desc" className={labelClass}>
                      Full Description
                    </label>
                    <textarea
                      id="app-desc"
                      rows={3}
                      maxLength={BLUEPRINT_LIMITS.app.descriptionMax}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="app-version" className={labelClass}>
                        Version
                      </label>
                      <input
                        id="app-version"
                        type="text"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className={`${inputClass} font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="app-size" className={labelClass}>
                        File Size
                      </label>
                      <input
                        id="app-size"
                        type="text"
                        value={form.fileSize}
                        onChange={(e) => setForm({ ...form, fileSize: e.target.value })}
                        placeholder="18 MB"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label htmlFor="app-ext" className={labelClass}>
                        File Type
                      </label>
                      <input
                        id="app-ext"
                        type="text"
                        value={form.assetKeyword}
                        onChange={(e) => setForm({ ...form, assetKeyword: e.target.value })}
                        placeholder=".apk / .exe"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="app-direct-url" className={labelClass}>
                      Direct Download URL (optional — auto-resolved from GitHub Releases)
                    </label>
                    <input
                      id="app-direct-url"
                      type="url"
                      value={form.directDownloadUrl}
                      onChange={(e) =>
                        setForm({ ...form, directDownloadUrl: e.target.value })
                      }
                      placeholder="https://github.com/RimonTimon/..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <span className={labelClass}>App Round Icon</span>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      {COVER_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setForm({ ...form, coverImage: preset.path })}
                          title={preset.label}
                          className={`w-11 h-11 rounded-full overflow-hidden transition-all cursor-pointer ${
                            form.coverImage === preset.path
                              ? 'ring-2 ring-blue-600 ring-offset-2'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={preset.path}
                            alt={preset.label}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      placeholder="Or paste an https:// icon URL..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="app-highlights" className={labelClass}>
                      Key Features (one per line, optional)
                    </label>
                    <textarea
                      id="app-highlights"
                      rows={2}
                      value={highlightsText}
                      onChange={(e) => setHighlightsText(e.target.value)}
                      placeholder="Lightweight and fast&#10;Direct GitHub updates"
                      className={inputClass}
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-blue-600 disabled:opacity-60 rounded-full transition-colors cursor-pointer"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>
                        {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Publish App'}
                      </span>
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-[#F5F5F7] hover:bg-zinc-200/70 rounded-full transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}

              {tab === 'apps' && (
                <div className="space-y-2.5">
                  {apps.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <p className="text-sm text-zinc-500">
                        No custom apps published yet. Add your first GitHub repo to replace the preview cards.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setTab('form');
                        }}
                        className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-blue-600 rounded-full transition-colors cursor-pointer"
                      >
                        Add App
                      </button>
                    </div>
                  ) : (
                    apps.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-[#F5F5F7] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                            {item.version} · {item.githubRepo}
                          </p>
                        </div>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-full cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white rounded-full cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title={item.isPublished ? 'Visible' : 'Hidden'}
                              onClick={() => handleTogglePublished(item)}
                              className="p-2 text-zinc-500 hover:text-zinc-900 rounded-full transition-colors cursor-pointer"
                            >
                              {item.isPublished ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => startEdit(item)}
                              className="p-2 text-zinc-500 hover:text-zinc-900 rounded-full transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 rounded-full transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'import' && (
                <div className="space-y-4">
                  <form onSubmit={handleLoadUserRepos} className="flex gap-2">
                    <input
                      type="text"
                      value={ghUsernameInput}
                      onChange={(e) => setGhUsernameInput(e.target.value)}
                      placeholder="RimonTimon"
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={loadingRepos}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-blue-600 disabled:opacity-60 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {loadingRepos && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Load Repos</span>
                    </button>
                  </form>
                  {importError && (
                    <p className="text-xs text-red-600">{importError}</p>
                  )}

                  {importedRepos.length > 0 && (
                    <div className="space-y-2">
                      {importedRepos.map((repo) => (
                        <div
                          key={repo.fullName}
                          className="p-3.5 rounded-2xl bg-[#F5F5F7] flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">
                              {repo.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              {repo.description || repo.fullName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectImportedRepo(repo.fullName)}
                            className="px-3.5 py-1.5 text-xs font-medium text-zinc-900 bg-white hover:bg-blue-600 hover:text-white rounded-full whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                          >
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
