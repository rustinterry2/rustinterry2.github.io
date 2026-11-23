# Crown — browser edition

A browser-compatible recreation of the Crown Pyto strategy game, with its existing graphics and a JavaScript port of the campaign engine. The browser game uses HTML5 Canvas with the original 852 × 1846 coordinate layout. No server-side runtime is necessary.

## Start locally

```bash
python -m http.server 8000
```

Open http://localhost:8000 in a modern browser. You must use HTTP rather than `file://` because the game uses JavaScript modules and fetches `assets/font_metrics.json`.

## Controls

Tap anywhere on the opening splash to select a character, difficulty, and kingdom. Tap map provinces to inspect, move into, or attack them depending on the current Orders screen. Use Seek Conquest → Transfer Troops to raise a field army before marching. Home castles require at least one catapult to attack. The AI automatically plays after each paid or hostile human action. There is no save/resume feature: each session is one continuous campaign, matching the Pyto game.

## Architecture

- `engine.js`: game-state model, troop accounting, battle probabilities, casualties, diplomacy, balanced Norman AI
- `app.js`: canvas rendering, touch controls, invitations, scene transitions, random-map generation, Robin Hood visits, and victory scenes
- `assets/`: original Pyto artwork and font atlas, reproduced with permission review pending
- `tests/`: Node's built-in test runner

Run tests with `npm test` (Node 20+). The browser engine uses its own seeded PRNG, not Python's Mersenne Twister, so outcomes are compared by rule invariants, not identical random sequences.

## Validation status

The engine passed automated tests over thousands of simulated AI turns, three difficulty levels, core troop accounting, leadership changes and siege restrictions. Automated graphical interaction was not verified in an iOS browser during creation. This is an initial browser port, not a line-for-line reproduction of every Pyto animation. No browser audio is included.

## Copyright

The strategy systems have been implemented for this project. The image collection includes assets related to Cinemaware's *Defender of the Crown* and should undergo a rights/permission review before public release. Code and artwork should not be assumed to share licensing.

## Pages hosting and repository migration

Current deployed URL: https://rustinterry2.github.io/crown/

This directory currently lives under the homepage repository. To split it into a standalone repo named `crown`, create that public repository, copy all files inside this `crown/` folder to the new repository root (including assets and tests), then enable GitHub Pages from the `main` branch root. GitHub project Pages will retain the URL `https://rustinterry2.github.io/crown/`. Update the homepage link if you choose a different repository name. Leave the homepage copy in place until deployment is confirmed, then remove it.

Changes: no browser saves or footer controls; black connected horses; territory outline selection; colored lord markers in logs; Sherwood click access; Robin portrait; unopposed capture; direct victory ending.
