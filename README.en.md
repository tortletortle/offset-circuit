# Offset Circuit

**An offline-first digital-logic puzzle game set aboard a damaged space station.**

[简体中文](README.md)

Offset Circuit teaches Boolean logic and digital-system reasoning through a six-chapter repair campaign. Players diagnose faults, reconfigure logic modules, sequence safety-critical actions and bring a station back online.

> The game interface and in-game text are currently Chinese. This English README is for project discovery; it does not claim full English localization.

## Play

1. Download this repository as a ZIP and extract it.
2. Open `index.html` in a modern desktop or mobile browser.
3. Start with **Chapter 1 — The Last Light**. The workbench and other experiments are also available from the game.

The game is a single HTML file. No build step, runtime package installation, API key or remote script is required.

## Campaign

- **01 — The Last Light:** infer the lighting controller from the main and emergency power truth table.
- **02 — Silent Airlock:** repair a two-condition safety interlock; unsafe door and pressure transitions are rejected.
- **03 — Runaway Manipulator:** program a seven-step cargo transfer through scene hotspots and a guided tutorial.
- **04 — The Missing Nanosecond:** reproduce a logic hazard, add a consensus term and test propagation-delay perturbations.
- **05 — Triple Backup:** calibrate redundant pressure channels, identify an inverted sensor and restore agreement.
- **06 — The Last Distress Call:** integrate redundant power, manipulator and airlock interlocks, sensor checks, timing verification, SOS transmission and a separate ground-station acknowledgement.

The original workbench remains available, including six logic-gate repair exercises, randomized challenges, fault diagnosis and a timing-delay laboratory.

## Progress and privacy

- Campaign progress is stored locally in the browser, with separate save keys for the chapters.
- There is no cloud sync or account system.
- Clearing browser site data removes local progress.
- If browser storage is blocked or full, the current session can continue but progress may not persist.

## Development and tests

Requirements: Node.js 20 or newer.

```sh
npm install
npx playwright install --with-deps chromium
npm test
```

The automated suite covers chapter state machines, safety invariants, logic/timing checks, progression, undo/reset, save/resume, storage failures, browser interaction and mobile viewport overflow. GitHub Actions runs the suite on Ubuntu 24.04 with Node.js 22 and Chromium.

## Simulation boundaries

This is an educational game, not a physical engineering simulator or a safety-certified control system.

- Airlock pressure is a discrete state, not a fluid-dynamics simulation.
- The robotic arm uses a finite-state action model, not rigid-body dynamics or collision physics.
- Timing experiments use a simplified event-driven digital-delay model, not SPICE, transistor-level timing sign-off or silicon measurements.
- Sensor faults are fixed teaching examples, not a model of analogue noise, drift or field calibration.
- The final mission is a deterministic state machine, not spacecraft dynamics, RF communication or a real emergency system.

## Project status

The current release candidate contains six chapters and a redesigned, tutorial-driven manipulator scene. It has automated Chromium coverage, but real-device testing, multi-browser testing and human playtesting are still required. See [the release audit](docs/PUBLIC_RELEASE_AUDIT.md).

## License

No license has been selected for this candidate yet. Public visibility alone does not grant permission to reuse, modify or redistribute the code or artwork. A license will be added after the rights and release scope are confirmed.

If you try the game after release, please share concrete bug reports and usability feedback through GitHub Issues.
