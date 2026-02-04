/**
 * Auralux — Audio Visualizer
 */

import { AudioAnalyzer } from './audio-analyzer.js';
import { Visualizer } from './visualizer.js';
import { UIController } from './ui-controller.js';

class Auralux {
    constructor() {
        this.audioAnalyzer = null;
        this.visualizer = null;
        this.ui = null;
        this.animationId = null;
        this.isRunning = false;
        this.init();
    }

    async init() {
        try {
            this.ui = new UIController();
            this.audioAnalyzer = new AudioAnalyzer();
            this.visualizer = new Visualizer(document.getElementById('canvas-container'));
            this.setupCallbacks();
            this.start();
            this.ui.hideLoader();
            console.log('[Auralux] Ready');
        } catch (err) {
            console.error('[Auralux] Init failed:', err);
            this.ui?.showError('Failed to initialize: ' + err.message);
        }
    }

    setupCallbacks() {
        // Audio
        this.ui.on('onMicrophoneClick', async () => {
            try {
                await this.audioAnalyzer.connectMicrophone();
                this.ui.setMicrophoneActive(true);
                this.ui.hideAudioPlayer();
            } catch (err) {
                this.ui.showError('Microphone access denied');
                this.ui.setMicrophoneActive(false);
            }
        });

        this.ui.on('onFileSelect', async (file) => {
            try {
                const info = await this.audioAnalyzer.connectAudioFile(file);
                this.ui.setMicrophoneActive(false);
                this.ui.showAudioPlayer(info);

                const audio = this.audioAnalyzer.getAudioElement();
                if (audio) {
                    audio.addEventListener('play', () => this.ui.setPlayingState(true));
                    audio.addEventListener('pause', () => this.ui.setPlayingState(false));
                    audio.addEventListener('ended', () => { this.ui.setPlayingState(false); this.ui.updateProgress(0, info.duration); });
                    audio.addEventListener('timeupdate', () => this.ui.updateProgress(this.audioAnalyzer.getCurrentTime(), this.audioAnalyzer.getDuration()));
                }
            } catch (err) {
                this.ui.showError('Failed to load audio: ' + err.message);
            }
        });

        this.ui.on('onPlayPause', () => this.ui.setPlayingState(this.audioAnalyzer.togglePlayPause()));
        this.ui.on('onSeek', (pos) => this.audioAnalyzer.seek(pos));

        // Visualizer
        this.ui.on('onGeometryChange', (type) => this.visualizer.setGeometry(type));
        this.ui.on('onDetailChange', (level) => this.visualizer.setDetail(level));
        this.ui.on('onRingsStyleChange', (style) => this.visualizer.setRingsStyle(style));
        this.ui.on('onRingsCountChange', (count) => this.visualizer.setRingsCount(count));
        this.ui.on('onSurroundTypeChange', (type) => this.visualizer.setSurroundType(type));
        this.ui.on('onSurroundCountChange', (count) => this.visualizer.setSurroundCount(count));
        this.ui.on('onBackgroundTypeChange', (type) => this.visualizer.setBackgroundType(type));
        this.ui.on('onBackgroundDensityChange', (density) => this.visualizer.setBackgroundDensity(density));

        this.ui.on('onRandomize', () => {
            const r = this.visualizer.randomize();
            this.ui.setGeometrySelect(r.geometry);
            this.ui.setDetailValue(r.detail);
            this.ui.setRingsSelect(r.rings);
            this.ui.setSurroundSelect(r.surround);
            this.ui.setBackgroundSelect(r.background);
        });
    }

    start() { this.isRunning = true; this.loop(); }
    stop() { this.isRunning = false; if (this.animationId) cancelAnimationFrame(this.animationId); }

    loop() {
        if (!this.isRunning) return;
        this.animationId = requestAnimationFrame(() => this.loop());
        
        if (this.audioAnalyzer.sourceType) {
            this.visualizer.update(this.audioAnalyzer.analyze());
        } else {
            this.visualizer.renderIdle();
        }
    }

    destroy() { this.stop(); this.audioAnalyzer?.destroy(); this.visualizer?.destroy(); }
}

document.addEventListener('DOMContentLoaded', () => { window.auralux = new Auralux(); });
window.addEventListener('beforeunload', () => { window.auralux?.destroy(); });
