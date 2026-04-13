# SPECTRA

## What This Is

A 1–4 player cooperative horror investigation game running entirely in the browser. Players explore a procedurally-lit haunted house, gather evidence, identify the ghost type, and escape — before it hunts them down. Inspired by Phasmophobia, built for the browser with zero loading screens.

## Core Value

A fully procedural horror experience — all visuals and audio synthesized from code, achieving instant loading and sub-500KB bundle size. The entire horror experience is generated from pure code, not external assets.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 1-4 player cooperative gameplay via WebSocket
- [ ] Procedurally-generated haunted house map (Victorian style)
- [ ] First-person controls with flashlight
- [ ] Ghost entity with behavior state machine (6 types)
- [ ] Evidence collection and journal system
- [ ] AI-powered ghost dialogue (GLM API)
- [ ] Procedural audio engine (Web Audio API)
- [ ] Win/lose conditions (identify ghost, escape)

### Out of Scope

- [External 3D models] — All geometry is procedural boxes/cylinders
- [External audio files] — All sounds synthesized via Web Audio API
- [Mobile app] — Browser-only for v1
- [Real-time chat] — Turn-based ghost responses only

## Context

- **Technical Environment**: Three.js + Vanilla JS, Node.js WebSocket server
- **Platform Target**: Any modern browser, 60fps on mid-range hardware
- **Dependencies**: GLM API key needed for ghost dialogue (configurable via .env)
- **Key Innovation**: Zero external assets — everything procedural

## Constraints

- **Bundle Size**: < 500KB (no external assets)
- **Load Time**: Instant — no loading screens
- **Network**: WebSocket multiplayer (1-4 players)
- **Audio**: Browser autoplay policy requires user click to initialize
- **API**: GLM API key required for ghost dialogue (fallback to pre-written responses if not provided)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js + Vanilla JS | Direct control for procedural generation, minimal bundle | — Pending |
| Procedural audio only | Zero external assets requirement | — Pending |
| WebSocket multiplayer | Real-time sync for co-op | — Pending |
| GLM API for dialogue | Context-aware ghost responses | — Pending |
| 6 ghost types | Sufficient variety for replayability | — Pending |

---
*Last updated: 2026-04-13 after initialization*