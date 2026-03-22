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

### Fixed
- Fixed Vercel deployment failing due to 236MB `traces.json` exceeding 100MB file size limit
- Fixed GitHub Actions workflow unable to push to `main` due to branch protection rules

### Security
- Updated Next.js from 16.1.6 to 16.2.1 to fix `undici` and `next` vulnerabilities
