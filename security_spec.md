# Security Specification — AppShelf Firestore Rules

## 1. Data Invariants

1. **Public Read Scope Isolation**:
   - Visitors may `get` or `list` documents in `/apps/{appId}` ONLY when `resource.data.isPublished == true`. Draft apps (`isPublished == false`) are strictly invisible to unauthenticated visitors and non-admin users.
   - Visitors may `get` only the singleton `/settings/studio` document. Listing `/settings` is explicitly forbidden.
2. **Verified Admin-Only Mutations**:
   - Only the bootstrapped studio owner (`mdrimon01889@gmail.com`) with `request.auth.token.email_verified == true` may `create`, `update`, or `delete` documents in `/apps/{appId}` or write `/settings/studio`.
3. **Strict Schema & Size Enforcement**:
   - Every write to `/apps/{appId}` and `/settings/studio` MUST pass `isValidShowcaseApp()` or `isValidStudioSettings()`, checking exact key allowlists (`hasAll` + `hasOnly`), field types, `.size()` bounds on every string/array, valid enum values for `platform`, regex validation for `githubRepo`, and `ownerId == request.auth.uid`.
4. **Temporal & Immutable Field Integrity**:
   - `createdAt` must equal `request.time` on creation and remain immutable (`incoming().createdAt == existing().createdAt`) on update.
   - `ownerId` must equal `request.auth.uid` on creation and remain immutable on update.
   - `updatedAt` must always equal `request.time` on both create and update.
5. **Path Variable Hardening**:
   - Single-document operations (`get`, `create`, `update`, `delete`) validate `isValidId(appId)` / `settingId == 'studio'` to block oversized or malformed document IDs.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target | Expected Result |
|---|--------------|--------|-----------------|
| 1 | Unauthenticated app creation | `POST /apps/evil-app` (no auth) | `PERMISSION_DENIED` |
| 2 | Non-admin signed-in user creates app | `POST /apps/spam-app` (`other@example.com`, verified) | `PERMISSION_DENIED` |
| 3 | Email spoofing (unverified admin email) | `POST /apps/spoof-app` (`mdrimon01889@gmail.com`, `email_verified: false`) | `PERMISSION_DENIED` |
| 4 | Shadow field injection on create | `POST /apps/app-1` with extra field `isAdminApproved: true` | `PERMISSION_DENIED` |
| 5 | Owner ID spoofing on create | `POST /apps/app-1` with `ownerId: "different-uid"` | `PERMISSION_DENIED` |
| 6 | Client-forged timestamp on create | `POST /apps/app-1` with `createdAt: Timestamp(2020-01-01)` | `PERMISSION_DENIED` |
| 7 | Oversized string payload (DoW) | `POST /apps/app-1` with `name` of 500 characters | `PERMISSION_DENIED` |
| 8 | Invalid GitHub repo pattern | `POST /apps/app-1` with `githubRepo: "javascript:alert(1)"` | `PERMISSION_DENIED` |
| 9 | Unbounded array / invalid highlight | `POST /apps/app-1` with `highlights` array of 10 items or numeric element | `PERMISSION_DENIED` |
| 10 | Immutable field tampering on update | `PATCH /apps/app-1` modifying `ownerId` or `createdAt` | `PERMISSION_DENIED` |
| 11 | Reading unpublished draft as visitor | `GET /apps/draft-1` (`isPublished: false`, no auth) | `PERMISSION_DENIED` |
| 12 | Path ID poisoning & arbitrary settings doc | `POST /settings/evil` or `POST /apps/bad$id!` | `PERMISSION_DENIED` |
