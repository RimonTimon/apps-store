/**
 * Security Rules Verification Spec — Dirty Dozen Payloads
 * Verifies all 12 adversarial payloads defined in security_spec.md fail against firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated app creation',
    operation: 'create',
    path: '/apps/evil-app',
    auth: null,
    payload: { name: 'Evil' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Non-admin verified user creates app',
    operation: 'create',
    path: '/apps/spam-app',
    auth: { uid: 'attacker-1', email: 'attacker@example.com', email_verified: true },
    payload: { name: 'Spam App' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified admin email spoof attack',
    operation: 'create',
    path: '/apps/spoof-app',
    auth: { uid: 'spoof-uid', email: 'mdrimon01889@gmail.com', email_verified: false },
    payload: { name: 'Spoofed App' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow ghost field injection on create',
    operation: 'create',
    path: '/apps/ghost-app',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: {
      name: 'Valid Name',
      tagline: 'Valid Tagline',
      description: 'Valid Description',
      platform: 'Android',
      category: 'Utility',
      githubRepo: 'user/repo',
      directDownloadUrl: '',
      assetKeyword: '.apk',
      version: 'v1.0.0',
      fileSize: '12 MB',
      coverImage: '',
      highlights: ['Fast'],
      featured: false,
      isPublished: true,
      sortOrder: 1,
      ownerId: 'admin-uid',
      isVerified: true, // Ghost field
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity spoofing via mismatched ownerId',
    operation: 'create',
    path: '/apps/identity-spoof',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { ownerId: 'someone-else-uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-forged createdAt timestamp',
    operation: 'create',
    path: '/apps/forged-time',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Oversized string Denial-of-Wallet attack',
    operation: 'create',
    path: '/apps/huge-string',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { name: 'A'.repeat(500) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Malformed GitHub repo injection',
    operation: 'create',
    path: '/apps/bad-repo',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { githubRepo: 'javascript:alert(1)' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Array overflow / invalid highlight element type',
    operation: 'create',
    path: '/apps/bad-array',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { highlights: [1, 2, 3, 4, 5, 6, 7, 8] },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable ownerId / createdAt modification on update',
    operation: 'update',
    path: '/apps/existing-app',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { ownerId: 'mutated-uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Visitor reads unpublished draft app',
    operation: 'get',
    path: '/apps/unpublished-draft',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Path ID poisoning & unauthorized settings document',
    operation: 'create',
    path: '/settings/unauthorized-doc',
    auth: { uid: 'admin-uid', email: 'mdrimon01889@gmail.com', email_verified: true },
    payload: { studioName: 'Hijacked' },
    expected: 'PERMISSION_DENIED',
  },
];
