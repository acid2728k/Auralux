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
        this.uiController = null;
        this.animationId = null;
        this.isRunning = false;
        
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('[Auralux] Initializing...');
            
            // Initialize UI Controller
            this.uiController = new UIController();
            
            // Initialize Audio Analyzer
            this.audioAnalyzer = new AudioAnalyzer();
            
            // Initialize Visualizer
            const container = document.getElementById('canvas-container');
            this.visualizer = new Visualizer(container);
            
            // Setup UI callbacks
            this.setupUICallbacks();
            
            // Start animation loop
            this.startAnimation();
            
            // Hide loading overlay
            this.uiController.hideLoading();
            
            console.log('[Auralux] Initialized successfully');
        } catch (error) {
            console.error('[Auralux] Initialization failed:', error);
            this.uiController?.showError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Setup UI event callbacks
     */
    setupUICallbacks() {
        // Microphone button
        this.uiController.on('onMicrophoneClick', async () => {
            try {
                await this.audioAnalyzer.connectMicrophone();
                this.uiController.setMicrophoneActive(true);
                this.uiController.hideAudioPlayer();
                console.log('[Auralux] Microphone connected');
            } catch (error) {
                this.uiController.showError('Microphone access denied. Please allow microphone access to use this feature.');
                this.uiController.setMicrophoneActive(false);
            }
        });
        
        // File selection
        this.uiController.on('onFileSelect', async (file) => {
            try {
                const trackInfo = await this.audioAnalyzer.connectAudioFile(file);
                this.uiController.setMicrophoneActive(false);
                this.uiController.showAudioPlayer(trackInfo);
                
                // Setup audio element event listeners
                const audioElement = this.audioAnalyzer.getAudioElement();
                if (audioElement) {
                    audioElement.addEventListener('play', () => {
                        this.uiController.setPlayingState(true);
                    });
                    
                    audioElement.addEventListener('pause', () => {
                        this.uiController.setPlayingState(false);
                    });
                    
                    audioElement.addEventListener('ended', () => {
                        this.uiController.setPlayingState(false);
                        this.uiController.updateProgress(0, trackInfo.duration);
                    });
                    
                    audioElement.addEventListener('timeupdate', () => {
                        this.uiController.updateProgress(
                            this.audioAnalyzer.getCurrentTime(),
                            this.audioAnalyzer.getDuration()
                        );
                    });
                }
                
                console.log('[Auralux] Audio file loaded:', trackInfo.name);
            } catch (error) {
                this.uiController.showError('Failed to load audio file: ' + error.message);
            }
        });
        
        // Play/Pause
        this.uiController.on('onPlayPause', () => {
            const isPlaying = this.audioAnalyzer.togglePlayPause();
            this.uiController.setPlayingState(isPlaying);
        });
        
        // Seek
        this.uiController.on('onSeek', (position) => {
            this.audioAnalyzer.seek(position);
        });
        
        // Shape change
        this.uiController.on('onShapeChange', (shape) => {
            this.visualizer.setShape(shape);
            console.log('[Auralux] Shape changed to:', shape);
        });
        
        // Sensitivity change
        this.uiController.on('onSensitivityChange', (value) => {
            this.visualizer.updateSettings({ sensitivity: value });
        });
        
        // Rotation speed change
        this.uiController.on('onRotationChange', (value) => {
            this.visualizer.updateSettings({ rotationSpeed: value });
        });
        
        // Color mode change
        this.uiController.on('onColorChange', (mode) => {
            this.visualizer.updateSettings({ colorMode: mode });
            console.log('[Auralux] Color mode changed to:', mode);
        });
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get audio data
        if (this.audioAnalyzer.sourceType) {
            const audioData = this.audioAnalyzer.analyze();
            
            // Update visualizer
            this.visualizer.update(audioData);
            
            // Update UI stats
            this.uiController.updateStats(audioData);
        } else {
            // Render idle animation when no audio source
            this.visualizer.renderIdle();
            
            // Reset stats
            this.uiController.updateStats({
                amplitude: 0,
                bass: 0,
                mid: 0,
                treble: 0
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAnimation();
        this.audioAnalyzer?.destroy();
        this.visualizer?.destroy();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.auralux = new Auralux();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    window.auralux?.destroy();
});
