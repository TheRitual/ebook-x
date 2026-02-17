## [1.2.3](https://github.com/TheRitual/ebook-x/compare/v1.2.2...v1.2.3) (2026-02-17)

### Bug Fixes

- Correct version syntax in nfpm.yaml for variable interpolation ([85011a1](https://github.com/TheRitual/ebook-x/commit/85011a1adf80b86f6c11d6e75665e26a11e14458))

## [1.2.2](https://github.com/TheRitual/ebook-x/compare/v1.2.1...v1.2.2) (2026-02-17)

### Bug Fixes

- Correct version syntax in nfpm.yaml and improve formatting in run-extract.mjs ([d621c05](https://github.com/TheRitual/ebook-x/commit/d621c050c97683c70df9b95718e4dff9ee451780))

# Unreleased

### Fixed

- View selected files: Images column now shows Yes when any selected format (MD/HTML/JSON) has “Include images” enabled in settings (previously only the first format was considered).
- View selected files: Removed duplicate bottom border line so the frame has a single bottom edge.

### Changed

- HTML styled output: Extraction footer and chapter navigation (previous / TOC / next) links now use the active HTML theme. New theme classes: extraction footer link, chapter nav, chapter nav link. Links have no underline by default and underline on hover; built-in themes updated for consistent footer and nav styling.

---

## [1.2.1](https://github.com/TheRitual/ebook-x/compare/v1.2.0...v1.2.1) (2026-02-17)

### Bug Fixes

- Load settings in CLI for improved configuration management ([6b55970](https://github.com/TheRitual/ebook-x/commit/6b55970a75c4307ca18738b7a40f3f1956e939f8))

# [1.2.0](https://github.com/TheRitual/ebook-x/compare/v1.1.0...v1.2.0) (2026-02-17)

### Features

- Add JSON and HTML output formats for EPUB extraction ([7aff811](https://github.com/TheRitual/ebook-x/commit/7aff8118e1d29f91e84cc1133f7955feba7dcf84))
- release 1.0.0 ([1802f56](https://github.com/TheRitual/ebook-x/commit/1802f568ef9072d92d829a5966fb4c038e7c9011))

# [1.1.0](https://github.com/TheRitual/epub-x/compare/v1.0.0...v1.1.0) (2026-02-17)

### Features

- Revamp EPUB extraction CLI with settings and improved output structure ([c45bfc5](https://github.com/TheRitual/epub-x/commit/c45bfc529f1dac0d913ba8f649aa8701755eb760))

# 1.0.0 (2026-02-17)

### Features

- Created project base ([6e8ff99](https://github.com/TheRitual/ebook-x/commit/6e8ff993e2e466f82b9c0c4170794e474ddd0a3a))
- Enhance EPUB extraction CLI with new features and tests ([7ad4c03](https://github.com/TheRitual/ebook-x/commit/7ad4c036dccadac2cd29ea470d39083cdedbac16))
- Implement EPUB extraction CLI with interactive menus and file handling ([0e2aa07](https://github.com/TheRitual/ebook-x/commit/0e2aa07108b33b74d023dfad10725f7d4b80f64b))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
