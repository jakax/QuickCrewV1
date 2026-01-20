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