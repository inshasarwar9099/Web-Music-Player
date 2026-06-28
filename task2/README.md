# 🎧 Aurora — Web Music Player

A premium, fully-functional music player built with **vanilla HTML5, CSS3, and JavaScript** — no frameworks, no libraries, no build step. Aurora looks and behaves like a commercial streaming product: a glassmorphic interface, a live audio visualizer, smart playback (shuffle / repeat / favorites), full keyboard control, light & dark themes, and a signature touch — **the entire UI recolors itself to the song that's playing.**

> **The twist:** Aurora ships with *zero audio files* yet plays the moment you open it. Every track is **composed live in your browser** with the Web Audio API — a real generative synth engine with seek, volume, and a frequency-reactive visualizer. (You can swap in real MP3s anytime — see [Using real audio files](#using-real-audio-files).)

---

## 📖 Project Overview

Aurora was built for the **HEX Softwares Web Development Internship (Project 1 — Web Music Player)**. The brief asked for a playlist, playback controls, a progress bar, seeking, and volume. Aurora delivers all of that and treats it as the floor, not the ceiling — adding a sidebar-driven library, search, categories, recently-played history, a like system, a mini + full player, an animated equalizer, a custom loading screen, and a complete accessibility layer.

The architecture is intentionally clean: the UI talks to an **audio engine through one small interface**, so the synthesized-audio engine and a real-file engine are fully interchangeable.

---

## ✨ Features

### Core requirements (from the brief)
- **Playlist display** — title, artist, album, duration, and cover for every track
- **Play / Pause** — with synced state across the mini player, full player, and list rows
- **Next / Previous** — queue-aware, with "restart current track" when you tap previous mid-song
- **Progress bar + seek** — drag, click, or use arrow keys to scrub anywhere in the track
- **Volume control** — animated slider with persistence between sessions

### Going beyond
- 🎨 **Dynamic theming** — the accent color and ambient background glow shift to each track's identity
- 🔀 **Shuffle** and 🔁 **Repeat** (off → all → one)
- ❤️ **Favorites / Like** — a "Liked Songs" playlist that persists in `localStorage`
- 🕑 **Recently played** — a horizontally scrolling history row
- 🔎 **Search** — instant filtering by title, artist, or album
- 🏷️ **Categories** — Chill, Ambient, Energy, Late Night
- 🔇 **Mute** toggle
- 🎚️ **Animated equalizer** on the now-playing bar and active row
- 💿 **Full player** with a spinning vinyl and a **canvas frequency visualizer**
- 📱 **Mini player** that stays docked and expands on tap
- ⌨️ **Keyboard shortcuts** for every major action
- 🌗 **Light / Dark theme switcher** (remembers your choice; respects OS preference)
- ⏳ **Custom loading screen**
- ♿ **Accessibility** — semantic landmarks, ARIA roles, live regions, full keyboard support, focus-visible rings, reduced-motion support
- 🪄 **Micro-interactions** — ripples, hover lifts, fades, smooth theme transitions

### ⌨️ Keyboard shortcuts
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `Space` | Play / Pause | `M` | Mute |
| `→` / `←` | Seek ±5s | `S` | Shuffle |
| `Shift + →` / `←` | Next / Previous | `R` | Repeat |
| `↑` / `↓` | Volume | `L` | Like current |
| `N` / `P` | Next / Previous | `F` | Full player |
| `/` | Focus search | `Esc` | Close / clear |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Markup | **HTML5** (semantic landmarks, ARIA) |
| Styling | **CSS3** — custom properties, grid, flexbox, backdrop-filter, keyframe animations |
| Logic | **Vanilla JavaScript (ES6+)** — classes, modules pattern, no dependencies |
| Audio | **Web Audio API** — generative synth engine + optional `<audio>` element engine |
| Storage | **localStorage** — favorites, recents, theme, volume |
| Type | **Bricolage Grotesque** + **Inter** (Google Fonts) |

**No frameworks. No bundler. No `npm install` to run it.** (`jsdom` appears in dev only, for the test harness.)

---

## 📂 Folder Structure

```
HexSoftwares_MusicPlayer/
├── index.html          # Markup & layout
├── style.css           # Design system, components, responsive + reduced-motion
├── script.js           # Data, audio engines, and UI controller
├── README.md
└── assets/
    ├── images/         # (optional) cover art / artist images if you add real files
    ├── music/          # (optional) drop real .mp3 files here — see below
    └── icons/          # (icons are inline SVG, so this stays empty by default)
```

> Covers and icons are generated at runtime (CSS gradients + inline SVG), so the `assets/` folders ship empty. They exist so you can drop in real media without touching the structure.

---

## 🚀 Installation

No build tools required.

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/HexSoftwares_MusicPlayer.git
cd HexSoftwares_MusicPlayer
```

Then either:

- **Open directly:** double-click `index.html`, or
- **Serve locally** (recommended — some browsers gate the Web Audio API behind a user gesture, which a server handles cleanly):

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000

# …or Node
npx serve
```

Click anywhere / press **Play** once to start audio (browsers require a gesture before sound can play).

---

## 🎮 Usage

1. **Open the app** — you'll see the loading screen, then the library.
2. **Press Play on the hero**, or click any track in the list.
3. **Watch the UI recolor** to the track and the equalizer come alive.
4. **Click the album art** (bottom-left) to open the **full player** with the vinyl + visualizer.
5. **Search**, filter by **category**, **like** songs, toggle **shuffle / repeat**, switch **theme** — everything persists.
6. **Resize the window** to see the responsive sidebar collapse into a hamburger menu and the player compact for mobile.

### Using real audio files
Aurora plays synthesized audio by default so it works with zero setup. To use your own tracks instead:

1. Drop audio files into `assets/music/`.
2. In `script.js`, add a `src` to each track in the `LIBRARY` array, e.g.
   ```js
   { id: "t01", title: "Neon Tides", /* … */, src: "assets/music/neon-tides.mp3" }
   ```
3. Set the flag at the top of `script.js`:
   ```js
   const USE_REAL_AUDIO = true;
   ```
That's the only change needed — the `AudioFileEngine` implements the same interface as the synth, so every control keeps working.

---

## 🖼️ Screenshots Section

> Add screenshots / a screen recording here for your submission and LinkedIn post.

| View | Screenshot |
|------|-----------|
| Home / Library (dark) | `./assets/images/screenshot-home-dark.png` |
| Full player + visualizer | `./assets/images/screenshot-full-player.png` |
| Light theme | `./assets/images/screenshot-light.png` |
| Mobile / responsive | `./assets/images/screenshot-mobile.png` |

*(Take screenshots once running, save them to `assets/images/`, and the paths above will resolve.)*

---

## 🔭 Future Improvements

- Drag-and-drop to build and reorder custom playlists
- A queue panel with upcoming tracks
- Real audio uploads from the user's device (drag a file onto the player)
- A proper graphic equalizer with adjustable bands (the Web Audio chain already supports it)
- Lyrics / synced timing view
- Cross-fade between tracks
- Service worker for full offline / installable PWA support

---

## 🙌 Credits

- **Developer:** *<Your Name>* — HEX Softwares Web Development Intern
- **Fonts:** [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) & [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- **Audio:** Original generative compositions synthesized with the [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API)
- **Icons:** Hand-built inline SVG
- **Artists & tracks:** Fictional, created for this demo — any resemblance to real artists is coincidental

Built as **Project 1** for the **HEX Softwares Internship Program**.

---

## 📄 License

Released under the **MIT License** — free to use, modify, and learn from.

```
MIT License · Copyright (c) 2025 <Your Name>
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction…
```

---

<p align="center">Made with the Web Audio API · <strong>Aurora</strong></p>
