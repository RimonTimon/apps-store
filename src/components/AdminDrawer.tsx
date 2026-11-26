import React, { useEffect, useState } from 'react';
import { deleteUser, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Download,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { ADMIN_EMAIL, auth, googleProvider } from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  GitHubRepoSummary,
  Language,
  PLATFORMS,
  PlatformType,
  ShowcaseApp,
  StudioSettings,
} from '../types/app';
import { COPY } from '../data/i18n';
import { COVER_PRESETS } from '../data/defaults';
import {
  AppFormPayload,
  createShowcaseApp,
  deleteShowcaseApp,
  saveStudioSettings,
  toggleShowcaseAppFlags,
  updateShowcaseApp,
} from '../services/firestore';
import {
  fetchGitHubRepoAutofill,
  fetchUserGitHubRepos,
  parseGitHubRepoInput,
} from '../services/github';

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  apps: ShowcaseApp[];
  settings: StudioSettings;
  lang: Language;
  onNotify: (message: string) => void;
}

type AdminTab = 'form' | 'apps' | 'import' | 'settings';

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
  settings,
  lang,
  onNotify,
}: AdminDrawerProps) {
  const t = COPY[lang].admin;

  const [tab, setTab] = useState<AdminTab>('form');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppFormPayload>(EMPTY_FORM);
  const [highlightsText, setHighlightsText] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [fetchingGh, setFetchingGh] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fetchMessage, setFetchMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // GitHub profile import state
  const [ghUsernameInput, setGhUsernameInput] = useState(settings.githubUsername || 'RimonTimon');
  const [importedRepos, setImportedRepos] = useState<GitHubRepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [importError, setImportError] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<StudioSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    setSettingsForm(settings);
    if (settings.githubUsername && !ghUsernameInput) {
      setGhUsernameInput(settings.githubUsername);
    }
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

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
    setSigningIn(true);
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email?.toLowerCase() || '';
      const isAuthorizedOwner =
        email === ADMIN_EMAIL.toLowerCase() && cred.user.emailVerified;

      if (!isAuthorizedOwner) {
        try {
          await deleteUser(cred.user);
        } catch {
          await signOut(auth);
        }
        setAuthError(
          'Access denied. Only the authorized studio owner can sign in.'
        );
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in could not be completed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleFetchFromGitHub = async (overrideRepo?: string) => {
    const raw = (overrideRepo ?? repoInput) || form.githubRepo;
    const parsed = parseGitHubRepoInput(raw);
    if (!parsed) {
      setFormError('Enter a valid GitHub repo like username/repo or https://github.com/username/repo');
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
      setFetchMessage(t.fetchSuccess);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'GitHub request failed.');
    } finally {
      setFetchingGh(false);
    }
  };

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedRepo = parseGitHubRepoInput(repoInput || form.githubRepo);
    if (!parsedRepo) {
      setFormError('Please provide a valid GitHub repository (owner/repo).');
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
        onNotify(COPY[lang].toast.appUpdated);
      } else {
        await createShowcaseApp(payload);
        onNotify(COPY[lang].toast.appPublished);
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
    try {
      await deleteShowcaseApp(id);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      onNotify(COPY[lang].toast.appDeleted);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleToggleFlags = async (
    app: ShowcaseApp,
    patch: { featured?: boolean; isPublished?: boolean }
  ) => {
    await toggleShowcaseAppFlags(app.id, {
      featured: patch.featured ?? app.featured,
      isPublished: patch.isPublished ?? app.isPublished,
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
        setImportError('No public repositories found for this username.');
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError('');
    try {
      await saveStudioSettings(settingsForm);
      onNotify(COPY[lang].toast.settingsSaved);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors';

  const labelClass = 'block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 h-16 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.title}
          </h2>
          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.signOut}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate */}
        {!user ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm w-full space-y-5 text-center">
              <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {t.signInTitle}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.signInDesc}
              </p>
              {authError && (
                <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>
              )}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {signingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{t.signInBtn}</span>
              </button>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm w-full space-y-4 text-center">
              <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {t.unauthorizedTitle}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.unauthorizedDesc}
              </p>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-500">
                {user.email}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Admin Tabs */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg">
                {(
                  [
                    { id: 'form', label: editingId ? t.tabEdit : t.tabAdd },
                    { id: 'apps', label: `${t.tabApps} (${apps.length})` },
                    { id: 'import', label: t.tabImport },
                    { id: 'settings', label: t.tabSettings },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                      tab === item.id
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'form' && (
                <form onSubmit={handleSubmitApp} className="space-y-5">
                  {/* GitHub Repo Auto-Fetch */}
                  <div>
                    <label htmlFor="gh-repo-input" className={labelClass}>
                      {t.githubInputLabel}
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
                        placeholder={t.githubInputPlaceholder}
                        className={inputClass}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchFromGitHub()}
                        disabled={fetchingGh}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {fetchingGh ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{fetchingGh ? t.fetching : t.fetchGithub}</span>
                      </button>
                    </div>
                    {fetchMessage && (
                      <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                        {fetchMessage}
                      </p>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="app-name" className={labelClass}>
                        {t.nameLabel}
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
                        {t.platformLabel}
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
                      {t.taglineLabel}
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
                      {t.descLabel}
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
                      <label htmlFor="app-category" className={labelClass}>
                        {t.categoryLabel}
                      </label>
                      <input
                        id="app-category"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.app.categoryMax}
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="app-version" className={labelClass}>
                        {t.versionLabel}
                      </label>
                      <input
                        id="app-version"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.app.versionMax}
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className={`${inputClass} font-mono`}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="app-size" className={labelClass}>
                        {t.fileSizeLabel}
                      </label>
                      <input
                        id="app-size"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.app.fileSizeMax}
                        value={form.fileSize}
                        onChange={(e) => setForm({ ...form, fileSize: e.target.value })}
                        placeholder="e.g. 18 MB"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="app-ext" className={labelClass}>
                        {t.assetKeywordLabel}
                      </label>
                      <input
                        id="app-ext"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.app.assetKeywordMax}
                        value={form.assetKeyword}
                        onChange={(e) => setForm({ ...form, assetKeyword: e.target.value })}
                        placeholder=".apk, .exe, .dmg"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label htmlFor="app-direct-url" className={labelClass}>
                        {t.directUrlLabel}
                      </label>
                      <input
                        id="app-direct-url"
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.app.directDownloadUrlMax}
                        value={form.directDownloadUrl}
                        onChange={(e) =>
                          setForm({ ...form, directDownloadUrl: e.target.value })
                        }
                        placeholder="https://github.com/..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {t.directUrlHint}
                  </p>

                  {/* Cover selector */}
                  <div>
                    <span className={labelClass}>{t.coverLabel}</span>
                    <div className="grid grid-cols-5 gap-2 mb-2.5">
                      {COVER_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setForm({ ...form, coverImage: preset.path })}
                          title={preset.label}
                          className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            form.coverImage === preset.path
                              ? 'border-blue-600'
                              : 'border-transparent opacity-75 hover:opacity-100'
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
                      maxLength={BLUEPRINT_LIMITS.app.coverImageMax}
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      placeholder={t.coverCustomPlaceholder}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="app-highlights" className={labelClass}>
                      {t.highlightsLabel}
                    </label>
                    <textarea
                      id="app-highlights"
                      rows={3}
                      value={highlightsText}
                      onChange={(e) => setHighlightsText(e.target.value)}
                      placeholder="Fast offline performance&#10;Direct GitHub auto-updates&#10;Clean minimal UI"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {t.highlightsHint}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-1">
                    <label className="inline-flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span>{t.featuredToggle}</span>
                    </label>
                    <label className="inline-flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPublished}
                        onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span>{t.publishedToggle}</span>
                    </label>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>
                        {saving ? t.saving : editingId ? t.updateBtn : t.publishBtn}
                      </span>
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        {t.cancelEdit}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {tab === 'apps' && (
                <div className="space-y-3">
                  {apps.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {t.noAppsYet}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setTab('form');
                        }}
                        className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        {t.tabAdd}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
                      {apps.map((item) => (
                        <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {item.platform} · {item.version} · {item.githubRepo}
                            </p>
                          </div>

                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                {t.deleteConfirm}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                              >
                                {t.confirmYes}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md cursor-pointer"
                              >
                                {t.confirmNo}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title="Toggle featured"
                                onClick={() =>
                                  handleToggleFlags(item, { featured: !item.featured })
                                }
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                  item.featured
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                }`}
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title={item.isPublished ? 'Published' : 'Hidden draft'}
                                onClick={() =>
                                  handleToggleFlags(item, {
                                    isPublished: !item.isPublished,
                                  })
                                }
                                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
                              >
                                {item.isPublished ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Edit app"
                                onClick={() => startEdit(item)}
                                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete app"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'import' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                      {t.importTitle}
                    </h3>
                    <form onSubmit={handleLoadUserRepos} className="flex gap-2">
                      <input
                        type="text"
                        value={ghUsernameInput}
                        onChange={(e) => setGhUsernameInput(e.target.value)}
                        placeholder={t.importPlaceholder}
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        disabled={loadingRepos}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {loadingRepos && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{t.loadRepos}</span>
                      </button>
                    </form>
                    {importError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {importError}
                      </p>
                    )}
                  </div>

                  {importedRepos.length > 0 && (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
                      {importedRepos.map((repo) => (
                        <div
                          key={repo.fullName}
                          className="py-3.5 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {repo.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {repo.description || repo.fullName}
                            </p>
                            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">
                              {repo.language || 'Repository'} · {repo.stars} stars
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectImportedRepo(repo.fullName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.useRepo}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {settingsError && (
                    <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg">
                      {settingsError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="set-name" className={labelClass}>
                      Studio / Brand Name
                    </label>
                    <input
                      id="set-name"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.settings.studioNameMax}
                      value={settingsForm.studioName}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, studioName: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="set-gh" className={labelClass}>
                      GitHub Username
                    </label>
                    <input
                      id="set-gh"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.settings.githubUsernameMax}
                      value={settingsForm.githubUsername}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, githubUsername: e.target.value })
                      }
                      placeholder="your-github-username"
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label htmlFor="set-kicker" className={labelClass}>
                      Hero Kicker
                    </label>
                    <input
                      id="set-kicker"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.settings.heroKickerMax}
                      value={settingsForm.heroKicker}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, heroKicker: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="set-headline" className={labelClass}>
                      Hero Headline
                    </label>
                    <input
                      id="set-headline"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.settings.heroHeadlineMax}
                      value={settingsForm.heroHeadline}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="set-sub" className={labelClass}>
                      Hero Subtext
                    </label>
                    <textarea
                      id="set-sub"
                      rows={3}
                      maxLength={BLUEPRINT_LIMITS.settings.heroSubtextMax}
                      value={settingsForm.heroSubtext}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, heroSubtext: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="set-about" className={labelClass}>
                      About Studio
                    </label>
                    <textarea
                      id="set-about"
                      rows={3}
                      maxLength={BLUEPRINT_LIMITS.settings.aboutTextMax}
                      value={settingsForm.aboutText}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, aboutText: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="set-contact" className={labelClass}>
                      Contact URL (https:// or mailto:)
                    </label>
                    <input
                      id="set-contact"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.settings.contactUrlMax}
                      value={settingsForm.contactUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, contactUrl: e.target.value })
                      }
                      placeholder="https://your-site.com or mailto:hello@example.com"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{t.settingsSave}</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
