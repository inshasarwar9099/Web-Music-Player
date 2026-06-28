/* =====================================================================
   Aurora — Music Player · script.js
   ---------------------------------------------------------------------
   Architecture
     • DATA            — the song library (with synth "score" per track)
     • SynthEngine     — generative Web Audio engine (default: works offline)
     • AudioFileEngine — plays real <audio> files when you supply them
     • Library         — search / filter / favorites / recently-played
     • UI              — rendering (cards, chips, tracklist, hero)
     • Controller      — transport, sliders, theme, shortcuts, full player
   The UI talks to an Engine through one small interface, so swapping
   synthesized audio for real MP3s is a one-line change (USE_REAL_AUDIO).
   ===================================================================== */
"use strict";

/* =====================================================================
   CONFIG
   ===================================================================== */
// Flip to true and give each song a `src` (in assets/music/) to play
// real audio files instead of the built-in synthesizer. See README.
const USE_REAL_AUDIO = false;

const KEYS = {
  liked:  "aurora.liked.v1",
  recent: "aurora.recent.v1",
  theme:  "aurora.theme",
  volume: "aurora.volume",
};

/* =====================================================================
   DATA — the library
   Each track carries display info, a color identity (which becomes its
   cover art AND the app's live accent), and a compact "score" the synth
   engine turns into music: scale, chord progression, tempo, timbres.
   ===================================================================== */
const SCALES = {
  minorPenta: [0, 3, 5, 7, 10],
  majorPenta: [0, 2, 4, 7, 9],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  aeolian:    [0, 2, 3, 5, 7, 8, 10],
};

const LIBRARY = [
  { id: "t01", title: "Neon Tides",      artist: "Maelle Voss",      album: "Afterglow",     category: "Chill",      duration: 168,
    colors: ["#6d28d9", "#db2777"], root: 220.00, bpm: 92,  scale: SCALES.aeolian,    prog: [0, -2, 3, 5],   padWave: "triangle", arpWave: "sawtooth" },
  { id: "t02", title: "Glass Horizon",   artist: "Ø Kestrel",        album: "Parallax",      category: "Ambient",    duration: 204,
    colors: ["#0ea5e9", "#22d3ee"], root: 196.00, bpm: 74,  scale: SCALES.lydian,     prog: [0, 5, 7, 2],    padWave: "sine",     arpWave: "triangle" },
  { id: "t03", title: "Velvet Circuit",  artist: "Nova Hartman",     album: "Afterglow",     category: "Energy",     duration: 186,
    colors: ["#f59e0b", "#ef4444"], root: 261.63, bpm: 118, scale: SCALES.minorPenta, prog: [0, 3, -2, 5],   padWave: "sawtooth", arpWave: "square"   },
  { id: "t04", title: "Slow Static",     artist: "Hale & Mira",      album: "Low Light",     category: "Late Night", duration: 222,
    colors: ["#4338ca", "#7c3aed"], root: 174.61, bpm: 68,  scale: SCALES.dorian,     prog: [0, 2, 5, 3],    padWave: "triangle", arpWave: "sine"     },
  { id: "t05", title: "Goldenrod",       artist: "Sable Court",      album: "Meridian",      category: "Chill",      duration: 195,
    colors: ["#16a34a", "#84cc16"], root: 246.94, bpm: 96,  scale: SCALES.majorPenta, prog: [0, 4, 5, 2],    padWave: "sine",     arpWave: "triangle" },
  { id: "t06", title: "Midnight Index",  artist: "Cassis",           album: "Low Light",     category: "Late Night", duration: 240,
    colors: ["#1e293b", "#6366f1"], root: 164.81, bpm: 84,  scale: SCALES.aeolian,    prog: [0, -2, -4, 3],  padWave: "triangle", arpWave: "sawtooth" },
  { id: "t07", title: "Paper Lanterns",  artist: "Yuki Lorne",       album: "Meridian",      category: "Ambient",    duration: 178,
    colors: ["#e11d48", "#f97316"], root: 293.66, bpm: 80,  scale: SCALES.lydian,     prog: [0, 7, 5, 9],    padWave: "sine",     arpWave: "triangle" },
  { id: "t08", title: "Drift Coast",     artist: "Maelle Voss",      album: "Parallax",      category: "Chill",      duration: 210,
    colors: ["#0d9488", "#06b6d4"], root: 220.00, bpm: 90,  scale: SCALES.dorian,     prog: [0, 5, 3, 7],    padWave: "triangle", arpWave: "sine"     },
  { id: "t09", title: "Pulse Theory",    artist: "Nova Hartman",     album: "Afterglow",     category: "Energy",     duration: 192,
    colors: ["#9333ea", "#ec4899"], root: 277.18, bpm: 124, scale: SCALES.minorPenta, prog: [0, 3, 5, 3],    padWave: "sawtooth", arpWave: "square"   },
  { id: "t10", title: "Quiet Machines",  artist: "Ø Kestrel",        album: "Low Light",     category: "Ambient",    duration: 256,
    colors: ["#334155", "#0ea5e9"], root: 155.56, bpm: 66,  scale: SCALES.aeolian,    prog: [0, 2, -2, 5],   padWave: "sine",     arpWave: "triangle" },
  { id: "t11", title: "Solar Rewind",    artist: "Sable Court",      album: "Meridian",      category: "Energy",     duration: 188,
    colors: ["#ca8a04", "#dc2626"], root: 233.08, bpm: 112, scale: SCALES.majorPenta, prog: [0, 5, 7, 4],    padWave: "sawtooth", arpWave: "square"   },
  { id: "t12", title: "Aubade",          artist: "Cassis",           album: "Parallax",      category: "Late Night", duration: 230,
    colors: ["#7c3aed", "#2563eb"], root: 207.65, bpm: 76,  scale: SCALES.dorian,     prog: [0, 3, 5, 2],    padWave: "triangle", arpWave: "sine"     },
];

/* =====================================================================
   SynthEngine — generative Web Audio
   A lookahead scheduler ("A Tale of Two Clocks") builds a soft electronic
   arrangement from each track's score: a pad chord per bar, a rolling
   arpeggio, a gentle kick, and an off-beat hat. The transport maps a
   virtual song-time onto the AudioContext clock so seeking works.
   ===================================================================== */
class SynthEngine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.duration = 0;
    this.playing = false;
    this.offset = 0;          // virtual song position captured at last (re)start
    this.startCtxTime = 0;    // ctx time at last (re)start
    this.volume = 0.8;
    this.muted = false;
    this._timer = null;
    this._beat = 0;
    this._lookahead = 0.12;   // seconds scheduled ahead
    this._tick = 25;          // scheduler interval (ms)
  }

  _ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    // Signal chain: voices → mix → gate(play/pause) → master(volume)
    //               → compressor → analyser → destination  (+ delay send)
    this.mix      = this.ctx.createGain();
    this.gate     = this.ctx.createGain();
    this.master   = this.ctx.createGain();
    this.comp     = this.ctx.createDynamicsCompressor();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.delay    = this.ctx.createDelay(1.0);
    this.delay.delayTime.value = 0.34;
    this.feedback = this.ctx.createGain();
    this.feedback.gain.value = 0.26;
    this.wet      = this.ctx.createGain();
    this.wet.gain.value = 0.22;

    this.gate.gain.value = 0;
    this.master.gain.value = this._effectiveVolume();

    this.mix.connect(this.gate);
    this.gate.connect(this.master);
    // delay send
    this.gate.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.wet);
    this.wet.connect(this.master);

    this.master.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  _effectiveVolume() {
    // headroom keeps the polyphonic mix from clipping
    return (this.muted ? 0 : this.volume) * 0.55;
  }

  load(track) {
    this.track = track;
    this.duration = track.duration;
    this.offset = 0;
    this._beat = 0;
  }

  get currentTime() {
    if (!this.ctx) return this.offset;
    const t = this.playing ? this.offset + (this.ctx.currentTime - this.startCtxTime) : this.offset;
    return Math.min(Math.max(t, 0), this.duration);
  }

  get isPlaying() { return this.playing; }

  async play() {
    this._ensureContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (this.playing) return;

    this.playing = true;
    this.startCtxTime = this.ctx.currentTime;
    this._beat = Math.ceil(this.offset / this._beatDur());
    // fade the gate in to avoid clicks
    this.gate.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gate.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.gate.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.05);

    this._timer = setInterval(() => this._schedule(), this._tick);
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.currentTime;     // freeze the playhead
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    if (this.ctx) {
      // fade out so in-flight voices don't leave a tail
      this.gate.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gate.gain.setValueAtTime(this.gate.gain.value, this.ctx.currentTime);
      this.gate.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
    }
  }

  seek(seconds) {
    const target = Math.min(Math.max(seconds, 0), this.duration);
    this.offset = target;
    if (this.playing && this.ctx) {
      this.startCtxTime = this.ctx.currentTime;
      this._beat = Math.ceil(target / this._beatDur());
    }
  }

  setVolume(v) {
    this.volume = Math.min(Math.max(v, 0), 1);
    if (this.ctx) this.master.gain.setTargetAtTime(this._effectiveVolume(), this.ctx.currentTime, 0.02);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(this._effectiveVolume(), this.ctx.currentTime, 0.02);
  }

  getAnalyser() { this._ensureContext(); return this.analyser; }

  /* ---- internals ---- */
  _beatDur() { return 60 / this.track.bpm; }
  _semiToFreq(semi) { return this.track.root * Math.pow(2, semi / 12); }
  _songToCtx(songTime) { return this.startCtxTime + (songTime - this.offset); }

  _schedule() {
    if (!this.playing) return;
    const beatDur = this._beatDur();
    const horizon = this.ctx.currentTime + this._lookahead;
    // schedule any beats that fall inside the lookahead window
    while (this._songToCtx(this._beat * beatDur) < horizon) {
      this._scheduleBeat(this._beat, beatDur);
      this._beat++;
    }
  }

  _scheduleBeat(beat, beatDur) {
    const t0 = this._songToCtx(beat * beatDur);
    if (t0 < this.ctx.currentTime - 0.05) return; // skip stale beats
    const bar = Math.floor(beat / 4);
    const inBar = beat % 4;
    const chordRoot = this.track.prog[bar % this.track.prog.length];

    // PAD — one sustained chord at the top of each bar
    if (inBar === 0) {
      const voicing = [0, 3, 7, 10].map((iv) => chordRoot + iv - 12);
      voicing.forEach((semi, i) =>
        this._voice(t0, this._semiToFreq(semi), this.track.padWave, beatDur * 4, 0.05, 900, 0.6 + i * 0.05)
      );
    }

    // KICK — soft pulse on every beat
    this._kick(t0, inBar === 0 ? 0.5 : 0.32);

    // ARP — two eighth-notes per beat from the chord/scale
    for (let e = 0; e < 2; e++) {
      const tArp = t0 + e * (beatDur / 2);
      const step = (beat * 2 + e);
      const scale = this.track.scale;
      const note = chordRoot + scale[(step * 2) % scale.length] + (step % 3 === 0 ? 12 : 0);
      this._voice(tArp, this._semiToFreq(note), this.track.arpWave, beatDur * 0.7, 0.06, 2400, 0.5);
    }

    // HAT — airy off-beat
    this._hat(t0 + beatDur / 2);
  }

  _voice(time, freq, type, dur, peak, cutoff, q) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = q || 0.5;
    o.type = type; o.frequency.value = freq;
    // gentle ADSR
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f); f.connect(g); g.connect(this.mix);
    o.start(time); o.stop(time + dur + 0.05);
  }

  _kick(time, peak) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(125, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.11);
    g.gain.setValueAtTime(peak, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    o.connect(g); g.connect(this.mix);
    o.start(time); o.stop(time + 0.2);
  }

  _hat(time) {
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate * 0.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 7000;
    src.buffer = this._noiseBuf;
    g.gain.setValueAtTime(0.08, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(f); f.connect(g); g.connect(this.mix);
    src.start(time); src.stop(time + 0.06);
  }
}

/* =====================================================================
   AudioFileEngine — same interface, backed by a real <audio> element.
   Used only when USE_REAL_AUDIO is true and a track has a `src`.
   ===================================================================== */
class AudioFileEngine {
  constructor(el) {
    this.el = el;
    this.track = null;
    this.el.volume = 0.8;
    this._analyser = null;
  }
  load(track) { this.track = track; this.el.src = track.src; this.el.load(); }
  get duration() { return this.el.duration || this.track?.duration || 0; }
  get currentTime() { return this.el.currentTime; }
  get isPlaying() { return !this.el.paused; }
  play() { return this.el.play(); }
  pause() { this.el.pause(); }
  seek(s) { this.el.currentTime = s; }
  setVolume(v) { this.el.volume = v; }
  setMuted(m) { this.el.muted = m; }
  getAnalyser() {
    if (this._analyser) return this._analyser;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const src = ctx.createMediaElementSource(this.el);
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 256;
    src.connect(this._analyser);
    this._analyser.connect(ctx.destination);
    return this._analyser;
  }
}

/* =====================================================================
   Library — data layer for views, search, favorites, history
   ===================================================================== */
const Library = {
  liked: new Set(load(KEYS.liked, [])),
  recent: load(KEYS.recent, []),
  search: "",
  category: "All",

  byId(id) { return LIBRARY.find((t) => t.id === id); },

  categories() {
    return ["All", ...Array.from(new Set(LIBRARY.map((t) => t.category)))];
  },

  visible() {
    const q = this.search.trim().toLowerCase();
    return LIBRARY.filter((t) => {
      const inCat =
        this.category === "All" ? true :
        this.category === "Liked Songs" ? this.liked.has(t.id) :
        t.category === this.category;
      const inSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q);
      return inCat && inSearch;
    });
  },

  toggleLike(id) {
    if (this.liked.has(id)) this.liked.delete(id);
    else this.liked.add(id);
    save(KEYS.liked, Array.from(this.liked));
    return this.liked.has(id);
  },

  pushRecent(id) {
    this.recent = [id, ...this.recent.filter((x) => x !== id)].slice(0, 8);
    save(KEYS.recent, this.recent);
  },
};

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function coverStyle(track) {
  const [a, b] = track.colors;
  return `radial-gradient(120% 120% at 20% 15%, ${a} 0%, ${b} 70%, ${b} 100%)`;
}
function escapeHTML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* =====================================================================
   App / Controller
   ===================================================================== */
const App = {
  engine: null,
  index: -1,            // index into the *current play queue*
  queue: LIBRARY.slice(),
  shuffle: false,
  repeat: "off",        // off | all | one
  muted: false,
  volume: load(KEYS.volume, 0.8),
  raf: null,
  dom: {},

  init() {
    this.engine = (USE_REAL_AUDIO) ? new AudioFileEngine($("#audio")) : new SynthEngine();
    this.cacheDom();
    this.initTheme();
    this.renderPlaylists();
    this.renderCategories();
    this.renderRecent();
    this.render();
    this.updateHero(LIBRARY[0]);
    this.bindEvents();
    this.engine.setVolume(this.volume);
    this.setVolumeUI(this.volume);
    this.hideLoader();
  },

  cacheDom() {
    const ids = [
      "loader","sr-live","tracklist","empty-state","empty-text","library-count",
      "search-input","theme-toggle","menu-btn","sidebar","scrim","playlist-list",
      "category-chips","recent-section","recent-row",
      "hero","hero-art","hero-eyebrow","hero-title","hero-meta","hero-play","hero-shuffle",
      "player","player-art","player-title","player-artist","like-btn",
      "play-btn","prev-btn","next-btn","shuffle-btn","repeat-btn","repeat-one",
      "mute-btn","queue-btn","expand-btn","progress-mobile",
      "time-current","time-total","seek","seek-fill","seek-knob",
      "volume","volume-fill","volume-knob",
      "full-player","full-bg","full-close","vinyl","viz",
      "full-album","full-title","full-artist",
      "full-time-current","full-time-total","full-seek","full-seek-fill","full-seek-knob",
      "full-play","full-prev","full-next","full-shuffle","full-repeat",
      "toast-stack",
    ];
    ids.forEach((id) => { this.dom[id] = document.getElementById(id); });
  },

  /* ---------- rendering ---------- */
  render() {
    const tracks = Library.visible();
    const list = this.dom["tracklist"];
    list.innerHTML = "";

    this.dom["library-count"].textContent =
      `${tracks.length} song${tracks.length === 1 ? "" : "s"}`;

    if (tracks.length === 0) {
      this.dom["empty-state"].hidden = false;
      this.dom["empty-text"].textContent = Library.search
        ? `Nothing matches “${Library.search}”.`
        : "This playlist is empty.";
    } else {
      this.dom["empty-state"].hidden = true;
    }

    const frag = document.createDocumentFragment();
    tracks.forEach((track, i) => frag.appendChild(this.trackRow(track, i)));
    list.appendChild(frag);
    this.syncCurrentRow();
  },

  trackRow(track, i) {
    const li = document.createElement("li");
    li.className = "track";
    li.dataset.id = track.id;
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-label", `Play ${track.title} by ${track.artist}`);
    const liked = Library.liked.has(track.id);

    li.innerHTML = `
      <span class="track__index">
        <span class="num">${i + 1}</span>
        <span class="play-ico"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
        <span class="eq-mini" aria-hidden="true"><span></span><span></span><span></span></span>
      </span>
      <span class="track__cover" style="background:${coverStyle(track)}"></span>
      <span class="track__main">
        <span class="track__title">${escapeHTML(track.title)}</span>
        <span class="track__artist">${escapeHTML(track.artist)}</span>
      </span>
      <span class="track__album">${escapeHTML(track.album)}</span>
      <span class="track__right">
        <button class="track__like ${liked ? "is-liked" : ""}" type="button"
                aria-label="${liked ? "Remove from" : "Add to"} Liked Songs" aria-pressed="${liked}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.7z"/></svg>
        </button>
        <span class="track__dur">${fmtTime(track.duration)}</span>
      </span>`;
    return li;
  },

  renderPlaylists() {
    const groups = ["Liked Songs", ...Array.from(new Set(LIBRARY.map((t) => t.category)))];
    const ul = this.dom["playlist-list"];
    ul.innerHTML = "";
    groups.forEach((name) => {
      const count = name === "Liked Songs"
        ? Library.liked.size
        : LIBRARY.filter((t) => t.category === name).length;
      const sample = name === "Liked Songs"
        ? (LIBRARY.find((t) => Library.liked.has(t.id)) || LIBRARY[0])
        : LIBRARY.find((t) => t.category === name);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "playlist-item";
      btn.type = "button";
      btn.dataset.playlist = name;
      btn.innerHTML = `
        <span class="playlist-item__cover" style="background:${coverStyle(sample)}"></span>
        <span class="playlist-item__name">${escapeHTML(name)}</span>
        <span class="playlist-item__count">${count}</span>`;
      li.appendChild(btn);
      ul.appendChild(li);
    });
  },

  renderCategories() {
    const wrap = this.dom["category-chips"];
    wrap.innerHTML = "";
    Library.categories().concat("Liked Songs").forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (cat === Library.category ? " is-active" : "");
      btn.type = "button";
      btn.dataset.cat = cat;
      btn.textContent = cat;
      wrap.appendChild(btn);
    });
  },

  renderRecent() {
    const section = this.dom["recent-section"];
    const row = this.dom["recent-row"];
    if (!Library.recent.length) { section.hidden = true; return; }
    section.hidden = false;
    row.innerHTML = "";
    Library.recent.forEach((id) => {
      const track = Library.byId(id);
      if (!track) return;
      const card = document.createElement("button");
      card.className = "card";
      card.type = "button";
      card.dataset.id = id;
      card.innerHTML = `
        <span class="card__cover" style="background:${coverStyle(track)}">
          <span class="card__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
        </span>
        <span class="card__title">${escapeHTML(track.title)}</span>
        <span class="card__sub">${escapeHTML(track.artist)}</span>`;
      row.appendChild(card);
    });
  },

  updateHero(track) {
    this.dom["hero-art"].style.background = coverStyle(track);
    this.dom["hero-eyebrow"].textContent = track.category;
    this.dom["hero-title"].textContent = track.title;
    this.dom["hero-meta"].textContent = `${track.artist} · ${track.album} · ${fmtTime(track.duration)}`;
    this.dom["hero"].dataset.id = track.id;
    this.setAccent(track);
  },

  // The signature move: the entire UI accent + ambient glow becomes the
  // current track's color identity.
  setAccent(track) {
    document.documentElement.style.setProperty("--accent", track.colors[0]);
    document.documentElement.style.setProperty("--accent-2", track.colors[1]);
  },

  /* ---------- playback ---------- */
  buildQueue() {
    const base = Library.visible();
    this.queue = base.length ? base : LIBRARY.slice();
    if (this.shuffle) {
      // Fisher–Yates, keeping the current track first if present
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
    }
  },

  playTrack(id, { rebuild = true } = {}) {
    if (rebuild) this.buildQueue();
    let idx = this.queue.findIndex((t) => t.id === id);
    if (idx === -1) { this.queue.unshift(Library.byId(id)); idx = 0; }
    this.index = idx;
    const track = this.queue[this.index];

    this.engine.load(track);
    this.engine.play().catch(() => {/* gesture/autoplay guard */});
    Library.pushRecent(track.id);
    this.renderRecent();

    this.updateHero(track);
    this.updateNowPlaying(track);
    this.setPlayingUI(true);
    this.startLoop();
    this.announce(`Playing ${track.title} by ${track.artist}`);
  },

  current() { return this.queue[this.index]; },

  togglePlay() {
    if (this.index === -1) { this.playTrack(Library.visible()[0]?.id || LIBRARY[0].id); return; }
    if (this.engine.isPlaying) {
      this.engine.pause();
      this.setPlayingUI(false);
    } else {
      this.engine.play().catch(() => {});
      this.setPlayingUI(true);
      this.startLoop();
    }
  },

  next(auto = false) {
    if (!this.queue.length) return;
    if (this.repeat === "one" && auto) { this.engine.seek(0); this.engine.play(); return; }
    let i = this.index + 1;
    if (i >= this.queue.length) {
      if (this.repeat === "all" || !auto) i = 0;
      else { this.engine.pause(); this.engine.seek(0); this.setPlayingUI(false); this.updateScrubbers(); return; }
    }
    this.playTrack(this.queue[i].id, { rebuild: false });
  },

  prev() {
    if (!this.queue.length) return;
    if (this.engine.currentTime > 3) { this.engine.seek(0); return; }
    let i = this.index - 1;
    if (i < 0) i = this.queue.length - 1;
    this.playTrack(this.queue[i].id, { rebuild: false });
  },

  /* ---------- UI sync ---------- */
  setPlayingUI(on) {
    document.body.classList.toggle("is-playing", on);
    this.dom["full-player"].classList.toggle("is-playing", on);
    const label = on ? "Pause" : "Play";
    this.dom["play-btn"].setAttribute("aria-label", label);
    this.dom["full-play"].setAttribute("aria-label", label);
    $$(".eq-mini").forEach((e) => e.classList.toggle("is-animating", on));
  },

  updateNowPlaying(track) {
    this.dom["player-art"].style.background = coverStyle(track);
    this.dom["player-title"].textContent = track.title;
    this.dom["player-artist"].textContent = track.artist;
    this.dom["time-total"].textContent = fmtTime(track.duration);
    this.dom["full-time-total"].textContent = fmtTime(track.duration);

    this.dom["full-album"].textContent = track.album;
    this.dom["full-title"].textContent = track.title;
    this.dom["full-artist"].textContent = track.artist;
    this.dom["vinyl"].style.setProperty("--c1", track.colors[0]);
    this.dom["full-bg"].style.background =
      `radial-gradient(120% 90% at 50% 0%, ${track.colors[0]}55, transparent 60%)`;
    $("#vinyl-disc").style.background = coverStyle(track);

    const liked = Library.liked.has(track.id);
    this.setLikeUI(liked);
    this.syncCurrentRow();
  },

  setLikeUI(liked) {
    const b = this.dom["like-btn"];
    b.classList.toggle("is-liked", liked);
    b.setAttribute("aria-pressed", String(liked));
    b.setAttribute("aria-label", liked ? "Remove from Liked Songs" : "Add to Liked Songs");
  },

  syncCurrentRow() {
    const cur = this.current();
    $$(".track", this.dom["tracklist"]).forEach((row) => {
      row.classList.toggle("is-current", !!cur && row.dataset.id === cur.id);
    });
  },

  updateScrubbers() {
    const dur = this.engine.duration || this.current()?.duration || 1;
    const t = this.engine.currentTime;
    const ratio = Math.min(t / dur, 1);
    const pct = (ratio * 100).toFixed(2) + "%";

    this.dom["seek-fill"].style.width = pct;
    this.dom["seek-knob"].style.left = pct;
    this.dom["full-seek-fill"].style.width = pct;
    this.dom["full-seek-knob"].style.left = pct;
    const mob = this.dom["progress-mobile"].firstElementChild;
    if (mob) mob.style.width = pct;

    this.dom["time-current"].textContent = fmtTime(t);
    this.dom["full-time-current"].textContent = fmtTime(t);

    this.dom["seek"].setAttribute("aria-valuenow", Math.round(ratio * 100));
    this.dom["seek"].setAttribute("aria-valuetext", fmtTime(t));
    this.dom["full-seek"].setAttribute("aria-valuenow", Math.round(ratio * 100));
  },

  startLoop() {
    if (this.raf) return;
    const step = () => {
      this.updateScrubbers();
      this.drawViz();
      if (this.engine.currentTime >= (this.engine.duration || 1e9) - 0.05 && this.engine.isPlaying) {
        this.next(true);
      }
      if (this.engine.isPlaying) this.raf = requestAnimationFrame(step);
      else { this.raf = null; }
    };
    this.raf = requestAnimationFrame(step);
  },

  /* ---------- visualizer ---------- */
  drawViz() {
    const canvas = this.dom["viz"];
    if (this.dom["full-player"].hidden) return;
    const analyser = this.engine.getAnalyser?.();
    const ctx2d = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);
    if (!analyser) return;

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);
    const bars = 48, step = Math.floor(bins / bars);
    const bw = w / bars;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim();
    const grad = ctx2d.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, accent || "#a855f7");
    grad.addColorStop(1, accent2 || "#ec4899");
    ctx2d.fillStyle = grad;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = Math.max(2, v * h);
      const x = i * bw;
      const y = (h - bh) / 2;
      const r = Math.min(bw * 0.32, 3);
      this.roundRect(ctx2d, x + bw * 0.18, y, bw * 0.64, bh, r);
    }
  },
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fill();
  },

  /* ---------- volume ---------- */
  setVolumeUI(v) {
    const pct = (v * 100).toFixed(1) + "%";
    this.dom["volume-fill"].style.width = pct;
    this.dom["volume-knob"].style.left = pct;
    this.dom["volume"].setAttribute("aria-valuenow", Math.round(v * 100));
  },
  setVolume(v, { fromUser = true } = {}) {
    this.volume = Math.min(Math.max(v, 0), 1);
    this.engine.setVolume(this.volume);
    this.setVolumeUI(this.volume);
    if (fromUser) save(KEYS.volume, this.volume);
    if (this.volume > 0 && this.muted) this.setMuted(false);
  },
  setMuted(m) {
    this.muted = m;
    this.engine.setMuted(m);
    document.body.classList.toggle("is-muted", m);
    this.dom["mute-btn"].setAttribute("aria-label", m ? "Unmute" : "Mute");
  },

  /* ---------- favorites ---------- */
  toggleLike(id) {
    const liked = Library.toggleLike(id);
    if (this.current() && this.current().id === id) this.setLikeUI(liked);
    // reflect on the row
    const row = $(`.track[data-id="${id}"]`, this.dom["tracklist"]);
    if (row) {
      const btn = $(".track__like", row);
      btn.classList.toggle("is-liked", liked);
      btn.setAttribute("aria-pressed", String(liked));
    }
    this.renderPlaylists();
    if (Library.category === "Liked Songs") this.render();
    this.toast(liked ? "Added to Liked Songs" : "Removed from Liked Songs");
  },

  /* ---------- theme ---------- */
  initTheme() {
    const saved = localStorage.getItem(KEYS.theme);
    const prefersLight = typeof matchMedia === "function" &&
      matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    this.applyTheme(theme);
  },
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    this.dom["theme-toggle"].setAttribute("aria-pressed", String(!dark));
    this.dom["theme-toggle"].setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    try { localStorage.setItem(KEYS.theme, theme); } catch {}
  },
  toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    this.applyTheme(cur === "dark" ? "light" : "dark");
  },

  /* ---------- shuffle / repeat ---------- */
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    [this.dom["shuffle-btn"], this.dom["full-shuffle"]].forEach((b) =>
      b.classList.toggle("is-active", this.shuffle));
    this.dom["shuffle-btn"].setAttribute("aria-pressed", String(this.shuffle));
    // rebuild queue around the current track
    const cur = this.current();
    this.buildQueue();
    if (cur) this.index = this.queue.findIndex((t) => t.id === cur.id);
    this.toast(this.shuffle ? "Shuffle on" : "Shuffle off");
  },
  cycleRepeat() {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off";
    const on = this.repeat !== "off";
    [this.dom["repeat-btn"], this.dom["full-repeat"]].forEach((b) =>
      b.classList.toggle("is-active", on));
    this.dom["repeat-one"].style.display = this.repeat === "one" ? "block" : "none";
    const label = this.repeat === "off" ? "Repeat off" : this.repeat === "all" ? "Repeat all" : "Repeat one";
    this.dom["repeat-btn"].setAttribute("aria-label", label);
    this.toast(label);
  },

  /* ---------- full player & sidebar ---------- */
  openFull() {
    this.dom["full-player"].hidden = false;
    this.dom["full-close"].focus();
  },
  closeFull() { this.dom["full-player"].hidden = true; },
  toggleSidebar(open) {
    const sb = this.dom["sidebar"];
    const willOpen = open ?? !sb.classList.contains("is-open");
    sb.classList.toggle("is-open", willOpen);
    this.dom["scrim"].hidden = !willOpen;
    this.dom["menu-btn"].setAttribute("aria-expanded", String(willOpen));
  },

  /* ---------- misc ---------- */
  hideLoader() {
    requestAnimationFrame(() =>
      setTimeout(() => this.dom["loader"].classList.add("is-hidden"), 480));
  },
  announce(msg) {
    const el = this.dom["sr-live"];
    el.textContent = ""; requestAnimationFrame(() => { el.textContent = msg; });
  },
  toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.setAttribute("role", "status");
    el.innerHTML = `<span class="toast__dot"></span><span>${escapeHTML(msg)}</span>`;
    this.dom["toast-stack"].appendChild(el);
    setTimeout(() => {
      el.classList.add("is-out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 2400);
  },

  /* ---------- events ---------- */
  bindEvents() {
    const d = this.dom;

    // transport
    d["play-btn"].addEventListener("click", () => this.togglePlay());
    d["full-play"].addEventListener("click", () => this.togglePlay());
    d["next-btn"].addEventListener("click", () => this.next());
    d["full-next"].addEventListener("click", () => this.next());
    d["prev-btn"].addEventListener("click", () => this.prev());
    d["full-prev"].addEventListener("click", () => this.prev());
    d["shuffle-btn"].addEventListener("click", () => this.toggleShuffle());
    d["full-shuffle"].addEventListener("click", () => this.toggleShuffle());
    d["repeat-btn"].addEventListener("click", () => this.cycleRepeat());
    d["full-repeat"].addEventListener("click", () => this.cycleRepeat());

    // hero
    d["hero-play"].addEventListener("click", () =>
      this.playTrack(d["hero"].dataset.id || LIBRARY[0].id));
    d["hero-shuffle"].addEventListener("click", () => {
      if (!this.shuffle) this.toggleShuffle();
      this.playTrack(Library.visible()[0]?.id || LIBRARY[0].id);
    });

    // like / mute
    d["like-btn"].addEventListener("click", () => { if (this.current()) this.toggleLike(this.current().id); });
    d["mute-btn"].addEventListener("click", () => this.setMuted(!this.muted));

    // full player open/close
    [d["expand-btn"], d["queue-btn"], d["player-art"]].forEach((b) =>
      b.addEventListener("click", () => this.openFull()));
    d["full-close"].addEventListener("click", () => this.closeFull());

    // theme + sidebar
    d["theme-toggle"].addEventListener("click", () => this.toggleTheme());
    d["menu-btn"].addEventListener("click", () => this.toggleSidebar());
    d["scrim"].addEventListener("click", () => this.toggleSidebar(false));

    // tracklist (delegation)
    d["tracklist"].addEventListener("click", (e) => {
      const likeBtn = e.target.closest(".track__like");
      const row = e.target.closest(".track");
      if (!row) return;
      if (likeBtn) { e.stopPropagation(); this.toggleLike(row.dataset.id); return; }
      this.playTrack(row.dataset.id);
    });
    d["tracklist"].addEventListener("keydown", (e) => {
      const row = e.target.closest(".track");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.playTrack(row.dataset.id); }
    });

    // recently played cards
    d["recent-row"].addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (card) this.playTrack(card.dataset.id);
    });

    // category chips + sidebar playlists
    d["category-chips"].addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) this.setCategory(chip.dataset.cat);
    });
    d["playlist-list"].addEventListener("click", (e) => {
      const item = e.target.closest(".playlist-item");
      if (item) { this.setCategory(item.dataset.playlist); this.toggleSidebar(false); }
    });

    // nav
    $$(".nav__item").forEach((btn) => btn.addEventListener("click", () => {
      $$(".nav__item").forEach((b) => { b.classList.remove("is-active"); b.removeAttribute("aria-current"); });
      btn.classList.add("is-active"); btn.setAttribute("aria-current", "page");
      const nav = btn.dataset.nav;
      if (nav === "search") d["search-input"].focus();
      else if (nav === "liked") this.setCategory("Liked Songs");
      else this.setCategory("All");
      this.toggleSidebar(false);
    }));

    // search
    d["search-input"].addEventListener("input", (e) => {
      Library.search = e.target.value; this.render();
    });

    // sliders
    this.makeSlider(d["seek"], (ratio) => {
      const dur = this.engine.duration || this.current()?.duration || 0;
      if (this.current()) this.engine.seek(ratio * dur);
      this.updateScrubbers();
    });
    this.makeSlider(d["full-seek"], (ratio) => {
      const dur = this.engine.duration || this.current()?.duration || 0;
      if (this.current()) this.engine.seek(ratio * dur);
      this.updateScrubbers();
    });
    this.makeSlider(d["volume"], (ratio) => this.setVolume(ratio));

    // keyboard shortcuts
    document.addEventListener("keydown", (e) => this.onKey(e));

    // ripple on prominent buttons
    [...$$(".btn"), d["play-btn"], d["full-play"]].forEach((b) => this.ripple(b));

    // close full player / sidebar on Escape handled in onKey
  },

  setCategory(cat) {
    Library.category = cat;
    this.renderCategories();
    this.render();
    // reflect active sidebar item
    $$(".playlist-item").forEach((i) => i.classList.toggle("is-active", i.dataset.playlist === cat));
  },

  // Reusable accessible slider: pointer drag + keyboard.
  makeSlider(bar, onInput) {
    const ratioFromEvent = (clientX) => {
      const r = bar.getBoundingClientRect();
      return Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    };
    let dragging = false;
    const down = (e) => {
      dragging = true; bar.classList.add("is-scrubbing");
      bar.setPointerCapture?.(e.pointerId);
      onInput(ratioFromEvent(e.clientX));
    };
    const move = (e) => { if (dragging) onInput(ratioFromEvent(e.clientX)); };
    const up = (e) => { dragging = false; bar.classList.remove("is-scrubbing"); bar.releasePointerCapture?.(e.pointerId); };
    bar.addEventListener("pointerdown", down);
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);

    bar.addEventListener("keydown", (e) => {
      const now = (parseFloat(bar.getAttribute("aria-valuenow")) || 0) / 100;
      let next = now;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = now + 0.05;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = now - 0.05;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 1;
      else return;
      e.preventDefault();
      onInput(Math.min(Math.max(next, 0), 1));
    });
  },

  onKey(e) {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

    if (e.key === "Escape") {
      if (!this.dom["full-player"].hidden) { this.closeFull(); return; }
      if (this.dom["sidebar"].classList.contains("is-open")) { this.toggleSidebar(false); return; }
      if (document.activeElement === this.dom["search-input"]) {
        this.dom["search-input"].value = ""; Library.search = ""; this.render(); this.dom["search-input"].blur();
      }
      return;
    }
    if (e.key === "/" && !typing) { e.preventDefault(); this.dom["search-input"].focus(); return; }
    if (typing) return;

    switch (e.key) {
      case " ": e.preventDefault(); this.togglePlay(); break;
      case "ArrowRight": e.preventDefault();
        e.shiftKey ? this.next() : (this.current() && this.engine.seek(this.engine.currentTime + 5), this.updateScrubbers()); break;
      case "ArrowLeft": e.preventDefault();
        e.shiftKey ? this.prev() : (this.current() && this.engine.seek(this.engine.currentTime - 5), this.updateScrubbers()); break;
      case "ArrowUp": e.preventDefault(); this.setVolume(this.volume + 0.05); break;
      case "ArrowDown": e.preventDefault(); this.setVolume(this.volume - 0.05); break;
      case "m": case "M": this.setMuted(!this.muted); break;
      case "s": case "S": this.toggleShuffle(); break;
      case "r": case "R": this.cycleRepeat(); break;
      case "l": case "L": if (this.current()) this.toggleLike(this.current().id); break;
      case "f": case "F": this.dom["full-player"].hidden ? this.openFull() : this.closeFull(); break;
      case "n": case "N": this.next(); break;
      case "p": case "P": this.prev(); break;
      default: break;
    }
  },

  ripple(el) {
    el.addEventListener("click", (e) => {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.width = s.style.height = `${size}px`;
      s.style.left = `${e.clientX - r.left - size / 2}px`;
      s.style.top = `${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      s.addEventListener("animationend", () => s.remove(), { once: true });
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
