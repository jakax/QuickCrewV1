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

### Improved
- Profile UX consistency across roles
- Clear, user-friendly messaging for pending approval states
- Centralized auth-based routing using AuthGate
- Cleaner separation between editable profile data and read-only account data

### Technical
- Profile now reads real Firestore user data
- Navigation after auth/state changes routed through `Gate`
- Prepared structure for future profile sections (bank details, documents, verification)
