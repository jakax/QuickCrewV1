## Git commands

Tag version with description (Do it in develop and the merge)
- git checkout developer
- git pull
- git tag -a v0.2.0 -m "v0.2.0: Employer job creation and job listing"
- git push origin v0.2.0

Merge version created in develop to stage
- git checkout stage
- git reset --hard v0.2.0
- git push -f origin stage

Which tag version am I
- git checkout stage
- git describe --tags

------------------------------------------------------------------------------------------

## v0.1.0
- Login (use real users)
- Create new users (worker and employer)

## v0.2.0
- Employer registration
- Organization creation
- Role-based tabs
- Logout

## v0.3.0
- Role-based navigation split (Worker vs Employer)
- Clean RootStack / Tabs / Stacks separation
- Shared JobItem + shared JobForm (DRY, long-term)
- Worker read-only JobDetails
- Employer editable JobDetails
- Jobs lists aligned with real Firestore data
- Clear ownership & permission boundaries
- Removal of legacy "Tabs" coupling

## v0.4.0 – Profile & Approval UX

### Added
- Role-based Profile screen (Worker / Employer)
- Approval status badge and banner for pending users
- Employer account review state handled in UI
- Worker verification state reflected in profile
- Logout confirmation with safe session reset via AuthGate
- Reuse JobsItem for Saved screen
- Force bookmarked state on saved cards
- Allow instant removal from Saved list
- Keep navigation to WorkerJobDetails
- Integrate with useSavedJobs realtime map"

### Improved
- Profile UX consistency across roles
- Clear, user-friendly messaging for pending approval states
- Centralized auth-based routing using AuthGate
- Cleaner separation between editable profile data and read-only account data

### Technical
- Profile now reads real Firestore user data
- Navigation after auth/state changes routed through `Gate`
- Prepared structure for future profile sections (bank details, documents, verification)

## v0.6.0 — Worker Application Flow (Core Marketplace Slice)
### Added

- Worker job application flow (apply to shift with eligibility checks)
- Applications Firestore collection with denormalized job data for fast rendering
- “Applied” tab (from scratch) showing:
- applied jobs
- status tags (Applied / Accepted / Rejected / Withdrawn)
- shift date/time
- rate
- Worker cancel shift flow (only allowed ≥ 8h before shift start)
- ConfirmProvider integration for cancel confirmations and error feedback
- Automatic reopening of jobs when a worker cancels (auto-assign mode)
- Eligibility gating:
- worker must be approved
- worker must be active
- applications close 8h before shift start
- Real-time applied jobs updates via Firestore snapshot

### Changed

- Removed bookmark/favorite functionality once a worker applies to a job
- Saved jobs are automatically cleared when a worker applies
- Bookmark toggle hidden on job cards and job details for already-applied jobs
- Job cards defensively hide bookmark when job is not open
- Improved worker job details UI feedback (Applied state + eligibility hints)

### Technical

- Introduced applications/{jobId_uid} document pattern
- Added transactional cancel flow (delete application + reopen job atomically)
- Added shiftStartAt-based time validation helpers
- Applied screen now uses Firestore subscriptions instead of static placeholder
- Standardized worker apply logic inside WorkerJobDetails

## v0.7.0 — Auto-Assign + Shift Lifecycle Stabilization (Phase A Completion)
### Added

- Auto-Assign shift flow (no approval required)
- Employers can disable approval during shift creation.
- Worker application instantly locks the shift when approval is disabled.
- businessApprovalRequired persisted in jobs collection.
- Auto-assign logic integrated into worker apply transaction.
- Shift day conflict guard (worker cannot apply to multiple shifts on same date).

- Worker shift-day lock mechanism:
- Prevents overlapping same-day applications.
- Automatically released when cancellation happens.
- Support for cancellation of accepted applications (auto-assigned jobs).
- Automatic reopening of shifts when auto-assigned worker cancels.
- Added assignment metadata cleanup on cancel:
- assignedWorkerUid
- assignedAt
- Extended cancel safeguards (≥ 4h before shift start).

### Changed

- JobForm now persists approval mode correctly during edit.
- Approval toggle state fully preserved across create/edit flows.
- Worker apply flow now checks approval mode to decide:
- pending application (manual approval)
- auto-assigned lock (no approval required).
- Improved shift time handling:
- split start/end time fields as source of truth.
- legacy shiftTime kept for compatibility.
- Application lifecycle unified for:
- pending
- accepted (auto-assign)
- cancelled.

### Fixed

- Edit shift bug resetting approval requirement.
- Firestore web error caused by incorrect collection import.
- Cancellation logic previously restricted to pending applications only.
- Auto-assigned jobs now correctly return to open state when cancelled.
- Worker shift lock cleanup on cancel.

### Technical

- Service-layer stabilization in jobs.service.
- Improved transaction safety in worker apply flow.
- Extended cancelJobApplication to support:
- accepted status
- job state rollback.
- Introduced lightweight worker day-lock pattern for overlap prevention.
- Continued backward compatibility with legacy shiftTime format.

### Phase milestone

✔️ Phase A (Hiring Core) effectively completed:

- Shift creation
- Approval vs Auto-Assign logic
- Worker apply & cancel lifecycle
- Conflict prevention safeguards

## v0.8.0 — Back Office (Admin) Foundation + Moderation + Org Config
### Added

- New Back Office web app (separate React/Vite app inside repo)
- Admin login via Firebase Auth + adminUsers gate (only QuickCrew admins can access)
- Protected routing + unauthorized screen handling
- Dashboard with navigation to core admin areas:
    - Workers
    - Approvals (deep review)
    - Skills Catalog
    - Organizations

### Users & Moderation
- Workers section with tabs:
    - Pending / Approved / Rejected / Suspended
    - Search (name / email / uid) + refresh actions
- Status change actions:
    - Approve / Set pending / Reject / Suspend
    - Reason required when rejecting or suspending (prompt UI)
- Status metadata persisted on user docs:
    - statusReason, statusUpdatedAt, statusUpdatedBy
- Lightweight audit trail:
    - statusHistory entries saved on each status change

### Approvals (Deep Review)
- Pending worker review screen with:
    - Worker profile summary
    - Skills assignment UI (checkbox chips)
    - Placeholders for CV/References (future app-side additions)
    - Approve/Reject flows write skills + status fields to users/{uid}

### Skills Catalog
- Firestore-backed skillsCatalog management:
    - Create new skill (normalized key)
    - Edit skill name
    - Activate/Deactivate skills (no hard delete)
    - Search + “show inactive” toggle
    - Skills list used in Approvals for assigning skills to workers

### Organizations
- Organizations list + detail view
- Org-specific roles & rates management per organization
- Each org maintains its own role-rate set (supports different employer agreements)

### UI / Technical
- Centralized Back Office styling via styles/ui.css (no inline styles)
- Shared UI primitives/providers (Prompt/Confirm pattern) used for admin actions
- Firestore queries and filtering standardized by role + approvalStatus

## v0.9.0 — Config changes
### Added

- Worker Profile
- Added IRD Number field
- Added Bank Account field
- Enabled worker ability to input and update IRD and bank details
- Back Office
- Back Office now reads and displays:
- IRD Number
- Bank Account details
- Improved worker financial data visibility for admin review

### Updated

- Date Picker
- Temporarily aligned Date Picker UX/behavior to match the current Time Picker implementation
- Simplified picker logic for consistency across shift creation

## v0.10.0 - Expo Development Build configuration 
### Authentication

- Google Login (Initial Setup)
- Added Google Sign-In configuration
- Integrated required environment variables and client IDs
- Prepared authentication flow for Dev Build compatibility

### Dev Infrastructure

- Expo Development Build Preparation
- Added configuration required for Expo Dev Client
- Prepared project for EAS development builds
- Updated app configuration to support custom native modules