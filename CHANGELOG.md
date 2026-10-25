# Changelog

All notable changes to CyberSim are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-10-25

### Changed
- Rebuilt as a website: sticky header with pill tags, `<code-style>` nav links, a numbered modules menu (also the mobile menu), a lime call-to-action and a progress line.
- New overview: gradient display headline, static geometric artwork (light beam, purple and teal columns, isometric plus, capsule), progress stats strip, featured phishing section with a phone mock-up, a bento module grid, a three-step explainer and a lime call-to-action band.
- Module pages: numbered side rail, large outlined module number, gradient title.
- Palette: charcoal with lime, purple, teal and coral.

### Removed
- Boot sequence, animated hero network, pointer spotlight and count-up numbers, to keep the site free of decorative motion.
- Fixed backgrounds and backdrop blur, which cost scroll performance.

## [1.3.0] - 2026-10-25

### Changed
- Complete visual redesign using two colours only, white and purple: a solid purple sidebar and hero, serif display headings, monospace labels, 2px ink borders and hard offset shadows.
- States are now shown by form rather than hue: solid fill for attacked/blocked/wrong, outline for safe/allowed/correct, diagonal stripes for warning/isolated/firewalled.
- Recoloured every module (virus chart, file badges, avatars, terminal, firewall log, strength bars) to the two-colour palette.

### Removed
- Certificate of completion.

## [1.2.0] - 2026-10-25

### Added
- Command palette (`Ctrl`/`⌘` + `K` or `/`) to search modules and run actions such as reset and shortcuts.
- Animated hero illustration on the overview: a small network with a radar sweep, moving packets and one compromised host.
- Short boot sequence on first load each session (skippable, and skipped entirely with reduced motion).
- "Sandbox · offline" status badge in the top bar.
- Pointer-following spotlight on module cards and pager links, count-up stats, large module numbers on cards.

### Changed
- Typography: platform display, text and monospace fonts (Segoe UI Variable and Cascadia on Windows, SF Pro and SF Mono on Apple) with tabular numbers. `Courier New` remains as the monospace fallback.
- New logo: a hexagonal cell with a terminal prompt.

## [1.1.0] - 2026-10-25

### Added
- Overview dashboard with module cards, progress stats, time remaining and a "continue" button.
- Completion tracking: each module has a goal, and the top bar shows visited and completed counts.
- Keyboard shortcuts (`1`–`0`, `[` `]`, `g`, `i`, `?`) with a help dialog; `P`/`L`/`N` in Phishing and `A`–`D` in the IR playbook.
- Custom inline SVG icon set (`js/icons.js`) replacing emoji.
- Previous/next pager at the bottom of every module.
- Phishing: mail-client layout, sender avatars, link-destination status bar, progress dots, streak, score ring, per-category results and a list of missed emails.
- Malware: scan progress bar, live stats and a quarantined-file inspector.
- Virus: infection-rate slider, network segmentation toggle and a live outbreak chart.
- Ransomware: file-type badges, offline-backup switch, countdown ransom note, and a choice between restoring, paying (partial recovery) and decrypting.
- Password: show/hide toggle, cryptographically random passphrase generator, strength checklist and a "fastest way in" verdict.
- Port scan: scan-type picker, clickable ports with service banner, risk and fix, and an Nmap-style report.
- Hash: 256-bit avalanche grid and 4/5/6 hex-character near-collision search with an extrapolated full-collision time.
- Firewall: reorderable rules, an "Allow all TCP" rule to demonstrate shadowing, matched-rule highlighting and a shadowing warning.
- IR playbook: incident ticket header, incident clock, letter grade and a timeline of your decisions.

### Changed
- Visual redesign: grid backdrop, monospace labels, refined cards, buttons, callouts and toasts.
- Rewrote interface copy to be plainer and more direct.

## [1.0.0] - 2026-10-25

### Added
- Single-page app shell: sidebar navigation with 10 numbered modules, hash-based routing, top bar with a modules-visited progress bar (saved in `localStorage` when available), hamburger menu on mobile, toast notifications.
- Shared helpers in `js/utils.js`: `shuffle`, `escapeHTML`, `toast`, cancellable timer groups, duration formatting.
- Module 1 — Phishing Simulator with 18 fictional emails (9 phishing, 9 legitimate) across six categories, scoring and in-email red-flag highlighting.
- Module 2 — SQL Injection Simulator with vulnerable (concatenated) and secure (parameterised) logins side by side.
- Module 3 — Malware Demo: animated scan terminal plus a "what if I hadn't scanned?" timeline.
- Module 4 — Virus Visualizer: 20×20 network grid with spreading infection and isolation.
- Module 5 — Ransomware Simulation: 24 file cards that flip to encrypted, a ransom note, and decryption.
- Module 6 — Password Cracking Visualizer: live entropy and brute-force, dictionary, rainbow-table and rule-based estimates.
- Module 7 — Port Scanner: scripted scan of 20 ports on a fictional host with high-risk findings.
- Module 8 — Hash Collision Demo: SHA-256 via Web Crypto (with a pure-JS fallback) and a birthday-attack near-collision finder.
- Module 9 — Firewall Rule Simulator: rule toggles, default policy, animated packets and a log.
- Module 10 — Incident Response Playbook: six-step branching decision tree ending in a NIST SP 800-61 summary.
- "How it works" explanation panel and Reset button on every module.
- README, MIT licence, `.gitignore`.
