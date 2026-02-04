# Auralux

A real-time audio visualizer built with Three.js and Web Audio API. Features reactive 3D visualizations that respond to music and sound.

![Auralux](https://img.shields.io/badge/version-1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Audio Analysis
- Real-time audio analysis using Web Audio API
- Amplitude, frequency band detection (bass, mid, treble)
- Peak/beat detection for reactive animations
- Support for microphone input and audio file playback

### 3D Visualization
- 6 unique visualization modes:
  - **Sphere Grid** — 25 spheres arranged in a spherical pattern
  - **Torus Ring** — 24 rotating torus segments
  - **Cube Matrix** — 27 cubes in a 3×3×3 grid
  - **Spiral Helix** — 40 octahedrons in a DNA-like helix
  - **Wave Field** — 100 cylinders in a reactive wave grid
  - **Particle Cloud** — 500 particles with additive blending

### Visual Effects
- Smooth animations: rotation, pulsation, scaling
- Dynamic color transitions
- 5 color palettes: Spectrum, Purple Haze, Cyan Pulse, Fire, Monochrome
- Adjustable sensitivity and rotation speed

### UI Features
- Minimalist dark theme interface
- Fullscreen mode (true fullscreen via `requestFullscreen`)
- Collapsible UI panel
- Real-time audio statistics display
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

2. Start a local web server. You can use any of these methods:

**Using Python:**
```bash
python -m http.server 8080
```

**Using Node.js (http-server):**
```bash
npx http-server -p 8080
```

**Using VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

3. Open `http://localhost:8080` in your browser

## Usage

### Audio Sources
- **Microphone**: Click the microphone button to use your device's microphone
- **Audio File**: Click "Load File" to select an audio file from your computer

### Controls
- **Shape**: Select visualization geometry
- **Sensitivity**: Adjust how reactive the visualization is to audio
- **Rotation Speed**: Control automatic rotation speed
- **Color Mode**: Switch between color palettes

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play/Pause audio |
| `H` | Hide/Show UI |
| `F` | Toggle fullscreen |

## Project Structure

```
Auralux/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Custom styles (dark theme)
├── js/
│   ├── main.js             # Application entry point
│   ├── audio-analyzer.js   # Web Audio API module
│   ├── visualizer.js       # Three.js visualization module
│   └── ui-controller.js    # UI management module
└── README.md
```

## Architecture

The application follows a modular ES6 architecture:

- **AudioAnalyzer**: Handles Web Audio API, FFT analysis, and audio source management
- **Visualizer**: Manages Three.js scene, geometries, and animations
- **UIController**: Handles DOM interactions and user input
- **Main**: Orchestrates all modules and manages the animation loop

## Technologies

- [Three.js](https://threejs.org/) — 3D graphics library
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Audio processing
- Vanilla JavaScript (ES6 modules)
- Custom CSS (no frameworks)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## License

MIT License — feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
