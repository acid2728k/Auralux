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
        // =====================================================
        // AUDIO
        // =====================================================
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
                    audio.addEventListener('ended', () => { 
                        this.ui.setPlayingState(false); 
                        this.ui.updateProgress(0, info.duration); 
                    });
                    audio.addEventListener('timeupdate', () => {
                        this.ui.updateProgress(this.audioAnalyzer.getCurrentTime(), this.audioAnalyzer.getDuration());
                    });
                }
            } catch (err) {
                this.ui.showError('Failed to load audio: ' + err.message);
            }
        });

        this.ui.on('onPlayPause', () => this.ui.setPlayingState(this.audioAnalyzer.togglePlayPause()));
        this.ui.on('onSeek', (pos) => this.audioAnalyzer.seek(pos));

        // =====================================================
        // GEOMETRY
        // =====================================================
        this.ui.on('onGeometryChange', (v) => this.visualizer.setGeometry(v));
        this.ui.on('onDetailChange', (v) => this.visualizer.setDetail(v));

        // =====================================================
        // RINGS
        // =====================================================
        this.ui.on('onRingsStyleChange', (v) => this.visualizer.setRingsStyle(v));
        this.ui.on('onRingsCountChange', (v) => this.visualizer.setRingsCount(v));

        // =====================================================
        // SURROUND
        // =====================================================
        this.ui.on('onSurroundTypeChange', (v) => this.visualizer.setSurroundType(v));
        this.ui.on('onSurroundCountChange', (v) => this.visualizer.setSurroundCount(v));

        // =====================================================
        // BACKGROUND
        // =====================================================
        this.ui.on('onBgPresetChange', (v) => this.visualizer.setBgPreset(v));
        this.ui.on('onBgBrightnessChange', (v) => this.visualizer.setBgBrightness(v));
        this.ui.on('onBgComplexityChange', (v) => this.visualizer.setBgComplexity(v));
        this.ui.on('onBgDepthChange', (v) => this.visualizer.setBgDepth(v));
        this.ui.on('onBgDynamicsChange', (v) => this.visualizer.setBgDynamics(v));
        this.ui.on('onBgTwinkleChange', (v) => this.visualizer.setBgTwinkle(v));
        this.ui.on('onBgParallaxChange', (v) => this.visualizer.setBgParallax(v));
        this.ui.on('onAudioSyncChange', (v) => this.visualizer.setBgAudioSync(v));

        // =====================================================
        // LIGHTING
        // =====================================================
        this.ui.on('onAmbientChange', (v) => this.visualizer.setAmbientIntensity(v));
        this.ui.on('onBacklightChange', (v) => this.visualizer.setBacklightIntensity(v));
        this.ui.on('onBacklightColorChange', (v) => this.visualizer.setBacklightColor(v));
        this.ui.on('onLightAudioChange', (v) => this.visualizer.setLightReactsToAudio(v));

        // =====================================================
        // GLOBAL
        // =====================================================
        this.ui.on('onGlobalLightChange', (v) => this.visualizer.setGlobalLight(v));
        this.ui.on('onTemperatureChange', (v) => this.visualizer.setTemperature(v));
        this.ui.on('onContrastChange', (v) => this.visualizer.setContrast(v));

        // =====================================================
        // SCENE
        // =====================================================
        this.ui.on('onBloomChange', (v) => this.visualizer.setBloom(v));
        this.ui.on('onFogChange', (v) => this.visualizer.setFog(v));

        // =====================================================
        // RANDOMIZE
        // =====================================================
        this.ui.on('onRandomize', () => {
            const r = this.visualizer.randomize();
            this.ui.setGeometrySelect(r.geometry);
            this.ui.setDetailValue(r.detail);
            this.ui.setRingsSelect(r.rings);
            this.ui.setSurroundSelect(r.surround);
            this.ui.setBgPresetSelect(r.bgPreset);
        });
    }

    start() { 
        this.isRunning = true; 
        this.loop(); 
    }
    
    stop() { 
        this.isRunning = false; 
        if (this.animationId) cancelAnimationFrame(this.animationId); 
    }

    loop() {
        if (!this.isRunning) return;
        this.animationId = requestAnimationFrame(() => this.loop());
        
        if (this.audioAnalyzer.sourceType) {
            this.visualizer.update(this.audioAnalyzer.analyze());
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

document.addEventListener('DOMContentLoaded', () => { 
    window.auralux = new Auralux(); 
});

window.addEventListener('beforeunload', () => { 
    window.auralux?.destroy(); 
});
