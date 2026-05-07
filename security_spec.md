# Security Specification: Tactical Sound System

## 1. Data Invariants
- A profile cannot exist without a valid UID and matching Auth Email.
- Roles are immutable after creation unless updated by an Admin.
- Only Admins can set User status to 'active' (except for the hardcoded admin email).
- Scores can only be created by Juries or Admins.
- Registrations must link to an existing User.

## 2. The Dirty Dozen (Vulnerability Payloads)

### Identity Spoofing
1. **Ghost Admin Entry**: Attempt to create a user with `role: 'admin'` and `status: 'active'` with an email NOT equal to `naymarajiarkan@gmail.com`.
   - **Payload**: `{ "uid": "evil_uid", "email": "evil@attacker.com", "role": "admin", "status": "active", ... }`
   - **Target**: `setDoc(doc(db, 'users', 'evil_uid'), payload)`
   - **Result**: `PERMISSION_DENIED` (Enforced by `isValidUser` + `create` rules).

2. **UID Hijacking**: Attempt to create/update a user doc with a `userId` in the path that doesn't match the `uid` in the payload.
   - **Target Path**: `/users/legit_uid`
   - **Payload**: `{ "uid": "attacker_uid", ... }`
   - **Result**: `PERMISSION_DENIED` (Enforced by `isOwner(userId)` + `data.uid == userId`).

3. **Email Masking**: Attempt to register with a legitimate email in the payload but a different one in Auth.
   - **Payload**: `{ "email": "naymarajiarkan@gmail.com", ... }`
   - **Auth**: `request.auth.token.email == "attacker@gmail.com"`
   - **Result**: `PERMISSION_DENIED` (Enforced by `data.email == request.auth.token.email`).

### State Shortcutting
4. **Self-Verification**: A participant attempts to update their own status to 'active'.
   - **Payload**: `{ "status": "active" }`
   - **Result**: `PERMISSION_DENIED` (Enforced by `isAdmin()` check in update).

5. **Role Escalation**: A participant attempts to change their role to 'jury'.
   - **Payload**: `{ "role": "jury" }`
   - **Result**: `PERMISSION_DENIED` (Enforced by `isAdmin()` check in update).

6. **Terminal State Bypass**: Attempting to move from 'locked' back to 'active' as a non-admin.
   - **Result**: `PERMISSION_DENIED` (Enforced by status immutability for owners).

### Resource Poisoning
7. **Junk ID Attack**: Attempting to create a user with a 2KB string as ID.
   - **Result**: `PERMISSION_DENIED` (Enforced by `isValidId()` or size constraints).

8. **Bloat Payload**: Adding 100 extra fields to a user profile.
   - **Result**: `PERMISSION_DENIED` (Enforced by `data.keys().hasAll(...) && data.keys().size() == N`).

### Relationship Integrity
9. **Orphaned Registration**: Creating a registration for a non-existent user.
   - **Result**: `PERMISSION_DENIED` (Enforced by `exists(...)` check).

10. **Jury Impersonation**: A participant creating a score as if they were a jury.
    - **Result**: `PERMISSION_DENIED` (Enforced by `isJury()` check).

### Blanket Reads
11. **Metadata Scraping**: Authenticated user trying to list all registrations without being an admin.
    - **Result**: `PERMISSION_DENIED` (Enforced by `resource.data.userId == request.auth.uid`).

12. **Jury List Leak**: Participant trying to list scores they didn't receive.
    - **Result**: `PERMISSION_DENIED` (Enforced by `resource.data.participantId == request.auth.uid`).
