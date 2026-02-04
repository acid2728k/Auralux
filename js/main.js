/**
 * Auralux — Audio Visualizer
 * Main entry point
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
            console.log('[Auralux] Starting...');

            // UI
            this.ui = new UIController();

            // Audio
            this.audioAnalyzer = new AudioAnalyzer();

            // Visualizer
            const container = document.getElementById('canvas-container');
            this.visualizer = new Visualizer(container);

            // Callbacks
            this.setupCallbacks();

            // Start loop
            this.start();

            // Hide loader
            this.ui.hideLoader();

            console.log('[Auralux] Ready');
        } catch (err) {
            console.error('[Auralux] Init failed:', err);
            this.ui?.showError('Failed to initialize: ' + err.message);
        }
    }

    setupCallbacks() {
        // Microphone
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

        // File
        this.ui.on('onFileSelect', async (file) => {
            try {
                const info = await this.audioAnalyzer.connectAudioFile(file);
                this.ui.setMicrophoneActive(false);
                this.ui.showAudioPlayer(info);

                const audio = this.audioAnalyzer.getAudioElement();
                if (audio) {
                    audio.addEventListener('play', () => this.ui.setPlayingState(true));
                    audio.addEventListener('pause', () => this.ui.setPlayingState(false));
                    audio.addEventListener('ended', () => {
                        this.ui.setPlayingState(false);
                        this.ui.updateProgress(0, info.duration);
                    });
                    audio.addEventListener('timeupdate', () => {
                        this.ui.updateProgress(
                            this.audioAnalyzer.getCurrentTime(),
                            this.audioAnalyzer.getDuration()
                        );
                    });
                }
            } catch (err) {
                this.ui.showError('Failed to load audio: ' + err.message);
            }
        });

        // Play/Pause
        this.ui.on('onPlayPause', () => {
            const playing = this.audioAnalyzer.togglePlayPause();
            this.ui.setPlayingState(playing);
        });

        // Seek
        this.ui.on('onSeek', (pos) => {
            this.audioAnalyzer.seek(pos);
        });

        // Geometry
        this.ui.on('onGeometryChange', (type) => {
            this.visualizer.setGeometry(type);
        });

        // Randomize
        this.ui.on('onRandomize', () => {
            const newGeom = this.visualizer.randomize();
            this.ui.setGeometrySelect(newGeom);
        });
    }

    start() {
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    loop() {
        if (!this.isRunning) return;
        this.animationId = requestAnimationFrame(() => this.loop());

        if (this.audioAnalyzer.sourceType) {
            const data = this.audioAnalyzer.analyze();
            this.visualizer.update(data);
        } else {
            this.visualizer.renderIdle();
        }
    }

    destroy() {
        this.stop();
        this.audioAnalyzer?.destroy();
        this.visualizer?.destroy();
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.auralux = new Auralux();
});

window.addEventListener('beforeunload', () => {
    window.auralux?.destroy();
});
