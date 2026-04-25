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

## v0.11.0 Forgot Password
### Added

- Added org-specific role loading for shift creation and editing.
- Added support for loading role rates from organizations/{orgId}/roleRates.
- Added role-to-rate auto population based on the selected primary role.
- Added reusable ScreenScrollKeyboard layout wrapper to centralize keyboard-safe form screens.
- Added Forgot Password flow using Firebase Auth password reset email.
- Added success and error states for Forgot Password.
- Added web-safe handling for auth/form screens so inputs remain usable in browser testing.
- Added Safe Area handling with react-native-safe-area-context where needed for better mobile layout support.

### Changed

- Reworked Create Shift form so roles/skills no longer come from the global skillsCatalog.
- Updated Create Shift and Edit Shift flows to use company-specific configured roles only.
- Updated primary role selection to be required before enabling submit.
- Updated submit logic so role rate must exist before a shift can be created or updated.
- Updated Create Shift and Edit Shift screens to disable submission while company role rates are still loading.
- Updated Edit Shift to support legacy fallback for primaryRoleKey using existing job skill data.
- Updated multiple auth and form screens to use the shared keyboard-safe layout pattern instead of duplicated per-screen wrappers.
- Improved scroll behavior and keyboard dismissal UX across form screens:
- tap outside to dismiss keyboard on mobile
- drag to dismiss keyboard on mobile
- cleaner browser behavior for web testing
- Improved Worker Job Details layout with Safe Area support and better long-content scrolling behavior.

### Fixed

- Fixed role source mismatch between form UI and company-configured role data.
- Fixed form submit button becoming active before a primary role was selected.
- Fixed potential invalid role/rate UX during shift create/edit flows.
- Fixed web typing/focus issues caused by mobile keyboard wrappers on auth/form screens.
- Fixed date modal useEffect dependency warning in JobForm.
- Fixed layout safety issues on screens with bottom fixed actions by introducing safe area handling.
- Fixed duplicated keyboard wrapper logic across multiple screens by centralizing it into a reusable layout component.

### Refactored

- Removed direct skillsCatalog fetching from JobForm.
- Simplified role option generation by deriving selectable roles from normalized roleRates.
- Cleaned Create Shift and Edit Shift screens by moving keyboard/scroll behavior into reusable wrappers.
- Standardized auth and organization creation screens around the same screen layout pattern.

## v0.12.0 - Major UI adaptation based on Ivan prototype across auth, worker, and employer flows, including functional worker profile photo upload

### Overview
This release focused on a broad UI adaptation across both worker and employer flows to align the app more closely with Ivan’s prototype. It includes updated layouts, improved visual consistency, floating navigation refinements, gradient-based screen styling, and a functional worker profile photo upload integrated with Firebase Storage / Firestore.

---

### Pre-login / Auth
- Adapted pre-login screen styling to better match the prototype
- Adapted login screen styling
- Adapted employer registration screen styling
- Adapted organization registration screen styling
- Adapted worker registration screen styling

---

### Worker App
#### Jobs
- Adapted worker job list screen styling
- Improved floating bottom navigation styling for worker tabs
- Refined spacing and layout to better match the prototype

#### Saved
- Adapted saved jobs screen styling to match updated QuickCrew visual language

#### Applied
- Adapted applied jobs screen styling to match updated QuickCrew visual language

#### Job Details
- Adapted worker job details screen styling
- Improved overall visual consistency with the prototype

#### Profile
- Adapted worker profile screen styling to closely match the prototype
- Reworked profile layout, form styling, dropdown styling, and action buttons
- Added functional worker profile photo upload
- Integrated profile photo upload with Firebase Storage
- Stored uploaded photo metadata in Firestore user document
- Confirmed uploaded photo renders correctly in the profile UI

---

### Employer App
#### Jobs
- Adapted employer job list styling
- Matched employer floating tab navigation styling with worker navigation
- Improved visual consistency between worker and employer experiences

#### Create Shift
- Adapted create shift screen styling to match QuickCrew design direction
- Added gradient-based screen shell and improved layout spacing
- Updated form styling to better align with the prototype
- Improved date and time picker presentation
- Improved button styling and overall visual hierarchy

#### Edit Shift
- Adapted edit shift screen styling to match create shift / QuickCrew design language
- Improved spacing and action layout
- Refined delete shift placement and bottom spacing
- Improved consistency between create and edit shift flows

#### Profile
- Adapted employer profile styling partially
- Improved visual consistency with QuickCrew profile patterns
- Further refinement still pending

---

### Shared / UX
- Improved consistency of colors, typography, spacing, borders, and gradients across adapted screens
- Reworked multiple screen shells so gradients are visible correctly across the full viewport
- Improved reusable scrolling / screen wrapper behavior for better gradient rendering on web
- Updated floating bottom navigation styling across worker and employer experiences

---

### Firebase / Storage
- Enabled functional worker profile photo upload
- Added Firebase Storage integration for profile image uploads
- Confirmed Firestore metadata updates after upload
- Confirmed uploaded assets are stored under the correct user path structure

---

### Notes
- Employer profile adaptation is still partial
- Some screens still need a final visual review / polish pass
- Additional refinement is planned in a follow-up pass, but this release represents a major prototype alignment milestone

### New fixes, busimess rules and styles
refactor(auth): fix Google and Apple Sign In flows

- Fix Google idToken extraction from result.data instead of result
- Fix duplicate GoogleSignin.signIn() call
- Implement Apple Sign In with expo-apple-authentication
- Auto-create Firestore worker profile on first social login
- Sync Google profile photo and name on login
- Add OAuthProvider credential flow for Apple/Firebase integration

refactor(profile): extract modals and clean up component

- Extract AddReferenceModal, DatePickerModal, SelectOptionModal as standalone components
- Replace inline date/select pickers with reusable modal components
- Fix date of birth picker reset bug
- Add visa document upload for non-citizen/resident workers
- Fix photo picker permissions with Settings redirect
- Fix deprecated MediaTypeOptions usage
- Remove unused imports, state, and styles

refactor(jobs): add readOnly mode and modal extraction

- Extract ShiftDateModal and ShiftTimeModal from JobForm
- Replace ShiftDateModal with generic DatePickerModal (supports iso/dmy formats)
- Add readOnly prop to JobForm — grays out all fields when job has applicants
- Block job editing from JobsItem when hasPendingApplicants is true
- Add readOnly banner in EmployerEditJob screen

feat(applicants): show worker profile in review screen

- Add WorkerProfileModal with CV link, references, about, right to work
- Enrich applicant data with worker profile fields from Firestore
- Add "View full profile" button per applicant card

fix(scroll): improve keyboard and scroll behavior across screens

- Remove nested ScrollView/KeyboardAvoidingView conflict in Profile
- Use automaticallyAdjustKeyboardInsets on Profile ScrollView
- Fix ScreenScrollKeyboard wrapper — remove behavior=height on Android
- Fix gray strip below keyboard on Android

refactor(utils): extract shared utilities

- Move sanitizePhone and isValidEmailLoose to utils/formatters.js


## [Unreleased] - 2026-04-25

### Fixed

#### Authentication & Login
- Redesigned login screen to clearly separate Worker and Employer entry points, reducing confusion about where each role should log in
- Added option for employers to register directly from the login screen
- Profile screen now displays the logged-in user's email address

#### Home Screen
- Removed the "Discover..." subtitle text below the QuickCrew logo on the main screen

#### Logout
- Simplified logout confirmation dialog to only show "Do you want to log out?" removing the redundant secondary message

#### Business Registration
- Fixed critical bug where submitting the Create Business form would show a loading state and then return to a blank form with no navigation path forward (affected both iOS and Android)
- Added company information field to the business profile, which will be used as default content for each shift posted
- Clarified Special Requirements field behavior — it is now an optional per-shift addition, not the primary company info field

#### Shifts
- Prevented shifts from being created or published with a past date
- Workers can no longer view or apply to shifts scheduled in the past
- Fixed shift status not updating correctly after cancellation — shifts now transition out of NEW status as expected
- Fixed duplicate "Cancel" option appearing when editing a shift and when cancelling an existing shift — renamed to "Discard" to avoid ambiguity
- Locked shift editing and cancellation once a worker has been assigned and clocked in (shift is ONGOING)
- Shifts with a clocked-in worker now display an ONGOING / IN PROGRESS status to distinguish them from upcoming assigned shifts
- Removed "Show rate on job post" option (hidden from UI)
- Fixed date and time pickers (DOB and all dropdowns) not rendering on Android

#### Time Records & Hour Review
- Approved hours and worked hours are now stored separately to preserve audit history — one no longer overwrites the other
- "Your Time Record" fields in the hour review screen now pre-populate with the values submitted by the worker, eliminating the need to manually copy them
- Removed redundant popup after business approves hours — only the confirmation message about submitted hours is shown
- Added a comments field in the hour review screen for businesses to leave notes about worker performance

#### Applicant Review
- Fixed the CLOSE button on worker profile modal being unreachable on Android due to positioning

#### Worker & Business Status
- Fixed shift statuses always showing as "Active" on the worker side regardless of actual state
- Fixed shift statuses displaying incorrectly on the business side