---
trigger: alwaysOn
description: Local workspace rules for Personal Intelligence Engine (Single-User V1)
---

# WORKSPACE RULES (LOCAL TO THIS PROJECT ONLY - SINGLE USER V1)

## 1. QUALITY & CODE STANDARDS
- Write production-ready, clean, scalable, and fully functional code.
- Shallow code, stubbed handlers, placeholder functions, or `// TODO` comments are strictly forbidden.
- Follow modular architecture (separation of concerns, clean domain boundaries, strict encapsulation).
- Implement strict type safety across the entire application stack.
- All modules must be thoroughly testable and include full test coverage (unit, integration, and e2e).

## 2. SINGLE-USER ARCHITECTURE & SCOPE
- **Zero Authentication Overhead:** No login, registration, password hashing, OAuth, or multi-tenant user tables are required.
- **Dedicated Single-User Focus:** The entire application is designed strictly for a single primary user.
- **Fixed Core Interest Tracks:** Initialize and maintain the 3 dedicated interest tracks:
  1. Big Tech & Ecosystem Code Upgrades (Google, Gemini, Meta, Node.js, React, Fastify, C++, Python, Rust, open-source releases).
  2. Entertainment Hub (Movies, TV series, trailers, streaming drops, box office, IMDb/TMDB reviews).
  3. Global Music & Tracks (Spotify trending releases, global charts, album drops, artist updates).
- **Control Interface:** The PWA acts directly as your personal control panel to toggle topics, add custom RSS/API feeds, adjust detail density (Compact vs. In-Depth), and trigger manual test runs.

## 3. GIT COMMIT EXECUTION PROTOCOL
- Organize and commit the codebase to the user-provided GitHub repository strictly across 7 to 8 atomic, high-value commits within a single workflow day.
- Every commit message must follow the Conventional Commits specification (`feat:`, `fix:`, `refactor:`, `test:`, `ci:`).

## 4. STORAGE & DATA RETENTION
- Enforce a strict **7-Day Rolling Retention Window (TTL purge)** for briefing records stored in the database to keep storage footprint under ~5–10 MB permanently.
