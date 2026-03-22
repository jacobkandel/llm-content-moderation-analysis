# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Contributing guide (CONTRIBUTING.md)
- Code of Conduct (CODE_OF_CONDUCT.md)
- Security policy (SECURITY.md)
- GitHub issue templates (bug report, feature request, new model request)
- Pull request template
- npm `overrides` in `web/package.json` to enforce patched versions of transitive dependencies (`flatted ≥3.4.2`, `serialize-javascript ≥7.0.3`, `undici ≥7.24.0`)

### Changed
- Removed `next-pwa` (abandoned) from the build — PWA service worker wrapper was stripping critical assets; the app continues to work fully without it
- Removed `@next/bundle-analyzer` require() from `next.config.ts` (still available as a devDep, run with `ANALYZE=true npm run build`)

### Fixed
- Fixed Vercel deployment failing due to 236MB `traces.json` exceeding 100MB file size limit
- Fixed GitHub Actions workflow unable to push to `main` due to branch protection rules
- Fixed audit pipeline failing to push results after long runs with `git pull --rebase` before push (prevents non-fast-forward rejection)
- Fixed CI build failing with `TypeError: require(...) is not a function` caused by ESM-incompatible `require()` calls in `next.config.ts`

### Security
- Updated Next.js from 16.1.6 to 16.2.1 to fix `undici` and `next` vulnerabilities
- Replaced abandoned `next-pwa@5.6.0` (vulnerable Workbox/serialize-javascript) with dependency removal — reduced npm audit findings from 29 → 0

