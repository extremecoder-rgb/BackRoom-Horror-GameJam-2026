# SPECTRA

> *"The dead don't rest here. Neither will you."*

A 1–4 player cooperative horror investigation game running entirely in the browser. Players explore a procedurally-lit haunted house, gather evidence, identify the ghost type, and escape — before it hunts them down.

## Prerequisites

- Node.js 18+
- Modern browser (Chrome, Firefox, Edge)

## Installation

```bash
npm install
```

## Running the Game

### Development (Both Servers)

```bash
npm run start
```

This runs both the WebSocket server (port 3000) and Vite dev server (port 5173).

### Separate Servers

**WebSocket Server:**
```bash
npm run server
```

**Vite Dev Server:**
```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

## Configuration

Create a `.env` file with your GLM API key for ghost dialogue:

```
GLM_API_KEY=your-api-key-here
```

Get your key from https://platform.zhipuai.cn/

The game works without an API key — the ghost simply won't respond to chat.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| F | Toggle flashlight |
| E | Interact (doors, objects) |
| T | Open chat |
| TAB | Open journal |
| G | Guess ghost type |
| SHIFT | Sprint |
| 1-7 | Cycle tools |

## Gameplay

1. **Create or join a room** with up to 4 players
2. **Explore the haunted house** using your flashlight
3. **Gather evidence** using detection tools
4. **Identify the ghost type** by finding 3 pieces of evidence
5. **Escape** through the exit door before the ghost hunts you down

## Architecture

```
src/
├── main.js           # Entry point
├── game/
│   ├── scene.js     # Three.js scene setup
│   └── renderer.js # WebGL renderer
├── network/
│   └── client.js   # WebSocket client
└── ui/
    └── lobby.js     # Lobby UI

server/
├── index.js        # WebSocket server
├── room-manager.js # Room management
└── game-state.js   # Server-authoritative state
```

## Features

- **Zero External Assets**: All visuals and audio generated procedurally
- **Instant Loading**: < 500KB bundle
- **WebSocket Multiplayer**: 1-4 player co-op
- **Procedural Map**: Victorian haunted house
- **6 Ghost Types**: Phantom, Banshee, Revenant, Shade, Poltergeist, Wraith
- **AI Dialogue**: GLM API integration for ghost responses

## License

MIT