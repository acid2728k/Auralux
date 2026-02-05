# Auralux

A deep, atmospheric 3D audio visualizer built with Three.js and Web Audio API. Features reactive geometry, particle systems, and immersive backgrounds that respond to music.

![Auralux](https://img.shields.io/badge/version-2.0.0-white)
![License](https://img.shields.io/badge/license-MIT-white)

## Features

### Audio Analysis
- Real-time audio analysis using Web Audio API
- Amplitude, frequency band detection (bass, mid, treble)
- Smooth audio metrics for natural animations
- Support for microphone input and audio file playback

### Center Geometry
11 unique 3D shapes organized in categories:

**Platonic Solids:**
- Tetrahedron, Cube, Octahedron, Dodecahedron, Icosahedron

**Complex Shapes:**
- Stellated Octahedron, Torus Knot, Klein Bottle, Möbius Strip

**Fractal:**
- Sierpinski Tetrahedron, Geodesic Sphere

Each shape features:
- Wireframe overlay with glow effect
- Audio-reactive scaling and rotation
- Adjustable detail level (1-6)

### Rings System
6 ring styles surrounding the center:
- **Orbital** — Tilted rotating rings
- **Saturn** — Flat concentric rings
- **Gyroscope** — Interlocking rings
- **Atomic** — Electron orbit style
- **Spiral** — Vertical helix arrangement
- **Cage** — Wireframe polyhedra shell

### Surround Elements
4 types of surrounding objects:
- **Polyhedra** — Floating wireframe shapes
- **Particles** — Small glowing spheres
- **Asteroids** — Rocky debris
- **Crystals** — Glowing cones

### Background System
Three-layer particle system with depth and parallax:

**Layers:**
- **FAR** — Tiny sparse dots, nearly static
- **MID** — Main dust/sparkles with drift and twinkle
- **NEAR** — Large pixels with strong parallax

**Presets (Frames):**
- **Void** — White/blue minimal
- **Nebula** — Purple/orange/cyan rich
- **Dust** — Grayscale subtle
- **Drift** — Cyan flowing
- **Prism** — Full spectrum

**Controls:**
- Brightness (0-2)
- Complexity (1-10) — particle count
- Depth (50-1000) — Z-axis range
- Dynamics (0-2) — motion speed
- Twinkle (0-1) — sparkle intensity
- Parallax (0-1) — layer speed difference
- Sync to Audio toggle

### Lighting
- Ambient light with adjustable intensity
- Directional backlight with color picker
- Audio-reactive light pulses (optional)

### Scene Effects
- Bloom post-processing
- Exponential fog for depth
- Subtle camera movement

### UI
- Minimalist black & white theme
- Collapsible panels
- Toggle switches
- Fullscreen mode
- Keyboard shortcuts

## Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Local web server (required for ES modules)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/acid2728k/Auralux.git
cd Auralux
```

2. Start a local web server:

**Python:**
```bash
python -m http.server 8080
```

**Node.js:**
```bash
npx http-server -p 8080
```

**VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

3. Open `http://localhost:8080` in your browser

## Usage

### Audio Sources
- **Microphone**: Click the mic button to use device microphone
- **Audio File**: Click "Audio" to load a file

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play/Pause audio |
| `H` | Hide/Show UI |
| `F` | Toggle fullscreen |
| `R` | Randomize scene |

## Project Structure

```
Auralux/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Black & white theme styles
├── js/
│   ├── main.js             # Application entry point
│   ├── audio-analyzer.js   # Web Audio API module
│   ├── visualizer.js       # Three.js core visualization
│   ├── background-system.js # Particle layers & lighting
│   └── ui-controller.js    # UI management
└── README.md
```

## Architecture

Modular ES6 architecture:

- **AudioAnalyzer** — Web Audio API, FFT analysis, source management
- **Visualizer** — Three.js scene, center geometry, rings, surround
- **BackgroundSystem** — Particle layers, background shader, lighting
- **UIController** — DOM interactions, collapsible panels
- **Main** — Module orchestration, animation loop

### BackgroundSystem
Separate module with clean lifecycle:
- `init()` — Create layers, lights, background quad
- `update(dt, audioMetrics)` — Animate particles, apply audio
- `dispose()` — Clean up resources

### Performance
- No GC in update loop (pre-allocated arrays)
- Wrap-around particle bounds
- Throttled audio reactions

## Technologies

- [Three.js](https://threejs.org/) v0.160.0 — 3D graphics
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Audio processing
- Custom GLSL shaders — Background and particles
- Vanilla JavaScript (ES6 modules)
- Custom CSS (no frameworks)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## License

MIT License — free for personal and commercial use.

## Contributing

Contributions welcome! Please submit a Pull Request.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open Pull Request
