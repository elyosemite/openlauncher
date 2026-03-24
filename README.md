<div align="center">

<img src="./assets/banner.svg" width="640" alt="OpenLauncher Banner" />

<br/>

# ⌨️ OpenLauncher

**A blazing-fast, keyboard-first command palette for your desktop.**  
Open anything — apps, URLs, system actions — with an upcoming AI-powered semantic engine.

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](#)

<br/>

```
╭──────────────────────────────────────────────────────────╮
│  ⬡ OpenLauncher                                     [esc]│
│  ·· ···················································· │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  ⬡  Visual Studio Code          Applications            │
│  ⬡  Figma                                               │
│  ◎  GitHub                       Web                    │
│  ◎  Claude                                              │
│  ⚡  Sleep                        Actions               │
│  ⚡  Lock Screen                                        │
╰──────────────────────────────────────────────────────────╯
```

</div>

---

## Why OpenLauncher?

Most app launchers are either too heavy, too opinionated, or locked to one platform.  
**OpenLauncher** is a lightweight, hackable alternative designed for speed and extensibility.

- **🚀 Performance-First**: Instant toggle and near-zero latency search.
- **🧠 AI-Ready**: Built with hooks for semantic search and local LLM integration.
- **🎨 Glassmorphism Design**: A modern UI that feels native on any OS.
- **⌨️ Keyboard-Centric**: Designed to keep your hands on the home row.

---

## Features

| Feature | Description |
|---|---|
| **⚡ Instant Toggle** | `Ctrl + Space` (Windows/Linux) or `Cmd + Space` (macOS). |
| **🔍 Smart Search** | Fuzzy matching for apps, files, and custom commands. |
| **🌐 Web Integration** | Instant Google/DuckDuckGo search with `?` prefix. |
| **🌗 Adaptive UI** | Automatic Light/Dark mode detection based on system theme. |
| **🛠️ Hackable Core** | Simple TypeScript architecture, easy to add your own providers. |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [npm](https://npmjs.com)

### Install & Run

```bash
git clone https://github.com/elyosemite/openlauncher.git
cd openlauncher
npm install
npm run build
npm start
```

---

## Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Space` | Toggle OpenLauncher |
| `↑` / `↓` | Navigate results |
| `Tab` | Cycle through categories |
| `Enter` | Execute selected action |
| `Esc` | Clear or Hide |

---

## Roadmap

- [ ] **🧠 Semantic Clipboard**: Search your copy history by meaning, not just text.
- [ ] **🎙️ Voice-to-Action**: Transcribe and execute commands via local Whisper.
- [ ] **📄 AI Resumes**: Summarize audio recordings and meetings automatically.
- [ ] **🧩 Plugin System**: Easy-to-write local scripts as custom commands.

---

## Project Structure

```
openlauncher/
├── src/
│   ├── main/
│   │   ├── index.ts       # Main process: window, shortcuts, IPC
│   │   └── preload.ts     # Context bridge
│   └── renderer/
│       ├── index.html     # UI Shell
│       ├── styles.css     # Glassmorphism design system
│       └── renderer.ts    # Frontend logic
└── assets/                # Logos and design assets
```

---

## License

MIT © [elyosemite](https://github.com/elyosemite)

<div align="center">
  <br/>
  Made with ❤️ for the developer community.
</div>
