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

### v0.6.0 — Worker Application Flow (Core Marketplace Slice)
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