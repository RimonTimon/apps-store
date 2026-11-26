import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BLUEPRINT_LIMITS, PLATFORMS, PlatformType, ShowcaseApp } from '../types/app';

function clampString(val: string, max: number): string {
  return val.trim().slice(0, max);
}

function sanitizeSafeUrl(val: string, max: number): string {
  const trimmed = val.trim().slice(0, max);
  if (!trimmed) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('/src/assets/images/')) {
    return trimmed;
  }
  return '';
}

function sanitizeDocId(seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || 'app'}-${suffix}`;
}

export interface AppFormPayload {
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
}

function buildSanitizedAppFields(input: AppFormPayload) {
  const { app: L } = BLUEPRINT_LIMITS;
  const platform: PlatformType = PLATFORMS.includes(input.platform)
    ? input.platform
    : 'Cross-Platform';

  const githubRepo = clampString(input.githubRepo, L.githubRepoMax);
  if (!L.githubRepoPattern.test(githubRepo)) {
    throw new Error('GitHub repository must be in owner/repo format.');
  }

  const name = clampString(input.name, L.nameMax);
  const tagline = clampString(input.tagline, L.taglineMax);
  const description = clampString(input.description || tagline, L.descriptionMax);
  const category = clampString(input.category || 'Utility', L.categoryMax) || 'Utility';
  const version = clampString(input.version || 'v1.0.0', L.versionMax) || 'v1.0.0';

  if (!name || !tagline || !description) {
    throw new Error('Name and short details are required.');
  }

  const highlights = (input.highlights || [])
    .map((item) => clampString(item, L.highlightItemMax))
    .filter(Boolean)
    .slice(0, L.highlightsMaxCount);

  const sortOrder = Math.max(0, Math.min(10000, Math.round(Number(input.sortOrder) || 0)));

  return {
    name,
    tagline,
    description,
    platform,
    category,
    githubRepo,
    directDownloadUrl: sanitizeSafeUrl(input.directDownloadUrl || '', L.directDownloadUrlMax),
    assetKeyword: clampString(input.assetKeyword || '', L.assetKeywordMax),
    version,
    fileSize: clampString(input.fileSize || '', L.fileSizeMax),
    coverImage: sanitizeSafeUrl(input.coverImage || '', L.coverImageMax),
    highlights,
    featured: Boolean(input.featured),
    isPublished: Boolean(input.isPublished),
    sortOrder,
  };
}

export function subscribeToApps(
  isAdminUser: boolean,
  onData: (apps: ShowcaseApp[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'apps';
  const appsRef = collection(db, path);
  const q = isAdminUser ? query(appsRef) : query(appsRef, where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ShowcaseApp[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: String(data.name || ''),
          tagline: String(data.tagline || ''),
          description: String(data.description || ''),
          platform: (PLATFORMS.includes(data.platform)
            ? data.platform
            : 'Cross-Platform') as PlatformType,
          category: String(data.category || 'Utility'),
          githubRepo: String(data.githubRepo || ''),
          directDownloadUrl: String(data.directDownloadUrl || ''),
          assetKeyword: String(data.assetKeyword || ''),
          version: String(data.version || 'v1.0.0'),
          fileSize: String(data.fileSize || ''),
          coverImage: String(data.coverImage || ''),
          highlights: Array.isArray(data.highlights)
            ? data.highlights.map((h) => String(h))
            : [],
          featured: Boolean(data.featured),
          isPublished: Boolean(data.isPublished),
          sortOrder: Number(data.sortOrder ?? 0),
          ownerId: String(data.ownerId || ''),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      items.sort((a, b) => a.sortOrder - b.sortOrder);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createShowcaseApp(input: AppFormPayload): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized. Please sign in with the admin account.');
  }

  const sanitized = buildSanitizedAppFields(input);
  const id = sanitizeDocId(sanitized.name);
  const path = `apps/${id}`;

  try {
    await setDoc(doc(db, 'apps', id), {
      ...sanitized,
      ownerId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateShowcaseApp(id: string, input: AppFormPayload): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized. Please sign in with the admin account.');
  }

  const sanitized = buildSanitizedAppFields(input);
  const path = `apps/${id}`;

  try {
    await updateDoc(doc(db, 'apps', id), {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleShowcaseAppFlags(
  id: string,
  flags: { featured: boolean; isPublished: boolean }
): Promise<void> {
  const path = `apps/${id}`;
  try {
    await updateDoc(doc(db, 'apps', id), {
      featured: Boolean(flags.featured),
      isPublished: Boolean(flags.isPublished),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteShowcaseApp(id: string): Promise<void> {
  const path = `apps/${id}`;
  try {
    await deleteDoc(doc(db, 'apps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
