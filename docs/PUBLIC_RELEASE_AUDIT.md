# Public release audit — 2026-11-22

## Candidate under review

- Repository: `tortletortle/offset-circuit`
- Candidate branch: `release/open-source-preparation`
- Source snapshot: commit `1dc0a94aba756d049a5b3d79f01d3d04bd257a81`
- Original feature branch: `polish/tutorial-driven-robot`
- Base: `main` at `5cad0fe1079bd9b66077cd42341d114857189829`
- GitHub PR #10 is the latest gameplay/UI change. This candidate consolidates its 81-commit feature chain from main; it is still a draft and is not merged or publicly released.

## Product scope in this candidate

Six narrative chapters are present, in addition to the original logic workbench and experiments:

1. Main/emergency lighting and Boolean truth-table repair.
2. Airlock interlock with independent safety checks.
3. Seven-step manipulator sequence, scene hotspots and guided tutorial.
4. Event-driven timing-hazard exercise and consensus-term repair.
5. Redundant sensor calibration and fault isolation.
6. Integrated station recovery and two-stage SOS / ground acknowledgement.

The latest UI update removes a permanent robot command deck and teaches actions through the scene and a step-by-step tutorial. This is reflected in the current browser tests.

## Automated validation evidence

GitHub Actions run `44899281649` tested commit `1dc0a94aba756d049a5b3d79f01d3d04bd257a81` on 2026-11-21:

- Workflow: **Game quality checks**
- Runner: Ubuntu 24.04
- Node.js: 22
- Browser: Playwright Chromium 141.0.7390.37
- Test command: `npm test`
- Result: **31 passed, 0 failed, 0 skipped**
- Job: `136831576933`, all setup, dependency installation, Chromium installation and test steps succeeded.

Coverage includes:
- Chapter state-machine invariants and unsafe-action rejection.
- Truth tables, timing hazards and 54 enumerated delay perturbations.
- Campaign progression from a clean start through the final SOS acknowledgement.
- Save/resume, undo/reset, corrupt/unavailable storage.
- Browser-level chapter interactions, robotic arm movement, responsive mobile width and uncaught page errors.
- HTML ID uniqueness, script parsing, offline-first checks and reduced-motion/mobile CSS.

This is reproducible CI evidence for that exact commit and environment. It does not prove real-device compatibility, human usability, long-session stability or correctness of physical engineering models.

### Failed runs and repair trail

Two earlier runs on the tutorial-refactor branch failed because browser tests still searched for the removed `[data-robot-add]` command buttons after the UI had switched to scene hotspots. The final browser-flow tests were updated to use `[data-robot-hotspot]`, check the absence of permanent command buttons and verify the guided sequence. The latest run above then passed all 31 tests. This was a test/UI contract mismatch that was corrected; it should remain visible in the project history rather than be hidden.

## Visual evidence

GitHub Actions run `44898724770` generated three actual Chromium screenshots as artifact `offset-circuit-visual-preview`:

- Workbench desktop.
- Robotic cargo-bay tutorial desktop.
- Robotic cargo-bay tutorial at a 390 px mobile viewport.

The screenshot run used the exact same `index.html` Git blob as the candidate (`e240b474a41cca256ab4297ca734f2150c8fffee`). The captures were visually inspected. The desktop UI is coherent and information-dense; the mobile layout stacks controls vertically and showed no horizontal overflow in the captured viewport. These are screenshots of a browser-rendered build, not generated concept art. The artifact expires after seven days; this candidate adds a workflow to regenerate it.

## Current-source checks

The candidate tree contains 11 tracked files: one single-file game, README, package manifest, CI workflow and six test files.

A heuristic scan of all 11 current text files found no matches for the tested patterns for:
- PEM private-key headers;
- common GitHub token formats and selected cloud/API key formats;
- obvious literal credential assignments;
- common user home-directory paths or email addresses;
- external HTTP(S) script/link tags;
- base64-embedded image/audio/font/application payloads.

The runtime game is a single HTML file. `package.json` has one pinned development dependency (`playwright@1.56.1`); it is used for tests, not loaded by the game at runtime. The current CI workflow uses `actions/checkout@v5`, `actions/setup-node@v5`, Ubuntu 24.04 and Node 22.

**Limitations:** this was a heuristic scan of the current tree, not a full-history secret scan. It did not establish ownership or licensing of every historical contribution, inspect every PR comment/attachment or every unreachable Git object, or prove the absence of all possible secrets. Run a dedicated history-aware scanner such as Gitleaks/TruffleHog against a full clone before public release; revoke/rotate any exposed credentials before considering history cleanup.

## Release blockers

| Item | Status | Required evidence/action |
|---|---|---|
| Six-chapter implementation | Present | Candidate source and test suite |
| Automated regression | Pass on the cited commit | Re-run on this candidate branch |
| Visual preview | Captured and inspected | Regenerate with the included workflow |
| Full-history secret scan | Not done | Scan all reachable history and review findings |
| Rights and license | Not confirmed | Owner confirms rights and chooses a license |
| Real phones / browsers | Not done | Test actual devices and at least two browser engines |
| Human playtest | Not done | Observe first-time players; record confusion and completion |
| Online demo | Not deployed | Configure Pages or another static host after visibility approval |
| Public repository visibility | Not changed | Owner approval required |

## Recommended release positioning

**Offset Circuit — a browser-based digital-logic puzzle game. Repair a damaged space station by debugging circuits, sequencing safe actions and restoring critical systems.**

Suggested GitHub Topics: `logic-puzzle`, `digital-logic`, `browser-game`, `educational-game`, `javascript`, `circuit`.

Do not claim user counts, ratings, Stars, real-world control accuracy or hardware-level validation without evidence.


## 2026-11-22 candidate refresh

- Release branch HEAD: `04ca94303149c4b4ad16c77384cdd32d3455141a`. Since the gameplay snapshot `1dc0a94`, subsequent commits add documentation, the screenshot workflow, a manual playtest protocol and structured issue forms; the game source and test suite are unchanged.
- Fresh GitHub Actions run `44982071995` tested the current HEAD on Ubuntu 24.04 / Node 22 / Chromium. Result: **31 passed, 0 failed, 0 skipped** (job `137084530090`). The log lists all 31 named tests.
- Fresh preview run `44982070136` completed successfully and uploaded `offset-circuit-release-preview` (artifact `14738460741`). It captured the workbench, robot cargo bay and 390 px mobile layout from the current candidate. The mobile capture was visually inspected again.
- `docs/PLAYTEST_PROTOCOL.md` now defines the real-device and first-time-player acceptance process. Bug-report and feature-request issue forms are included.
- PR #4 is now the consolidated release-candidate PR against `main`; it remains a draft. Main has not been changed and repository visibility remains private.

The automated evidence is strong enough to continue release preparation, but it does not clear the legal, full-history security, real-device or human-playtest blockers above.


## Final candidate check — 2026-11-22

- Release branch content before this audit-only update: `7ec8a8d26196f9477e449e2b69bdcd0ca0fd1c50`.
- Latest full quality run `44982182510` on that candidate completed successfully: **31 tests passed, 0 failed, 0 skipped** (job `137084871803`).
- Latest visual capture run `44982179211` completed successfully and uploaded artifact `offset-circuit-release-preview` (artifact `14738580183`).
- The only change after that tested candidate is this audit document update; no game source, test or dependency files changed.
