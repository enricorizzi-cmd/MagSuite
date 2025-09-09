# Release Planning

This document outlines the process for preparing a new MagSuite release.

## Release Notes
- Collect merged pull requests and categorize them as features, fixes, or chores.
- Include migration steps or breaking changes when necessary.
- Store notes in `docs/releases/<version>.md` and link them from the changelog.

## Deploy Checklist
- [ ] Ensure backend and frontend tests pass.
- [ ] Update version numbers.
- [ ] Create a database backup.
- [ ] Deploy to staging and perform smoke tests.
- [ ] Draft and publish release notes.
- [ ] Tag the commit and push the tag.
- [ ] Deploy to production.
- [ ] Monitor logs and metrics after deployment.
