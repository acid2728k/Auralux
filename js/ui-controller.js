/**
 * UIController Module
 * Handles all UI interactions and state management
 */

export class UIController {
    constructor() {
        // DOM Elements
        this.elements = {
            // Main panel
            uiPanel: document.getElementById('ui-panel'),
            btnHideUI: document.getElementById('btn-hide-ui'),
            btnShowUI: document.getElementById('btn-show-ui'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            
            // Audio controls
            btnMicrophone: document.getElementById('btn-microphone'),
            audioFileInput: document.getElementById('audio-file-input'),
            audioPlayer: document.getElementById('audio-player'),
            trackName: document.getElementById('track-name'),
            btnPlay: document.getElementById('btn-play'),
            progressFill: document.getElementById('progress-fill'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            progressBar: document.querySelector('.progress-bar'),
            
            // Visualization settings
            selectShape: document.getElementById('select-shape'),
            rangeSensitivity: document.getElementById('range-sensitivity'),
            rangeRotation: document.getElementById('range-rotation'),
            selectColor: document.getElementById('select-color'),
            
            // Stats
            statAmplitude: document.getElementById('stat-amplitude'),
            statBass: document.getElementById('stat-bass'),
            statMid: document.getElementById('stat-mid'),
            statTreble: document.getElementById('stat-treble'),
            barAmplitude: document.getElementById('bar-amplitude'),
            barBass: document.getElementById('bar-bass'),
            barMid: document.getElementById('bar-mid'),
            barTreble: document.getElementById('bar-treble'),
            
            // Loading
            loadingOverlay: document.getElementById('loading-overlay')
        };
        
        // State
        this.isUIVisible = true;
        this.isPlaying = false;
        
        // Event callbacks
        this.callbacks = {
            onMicrophoneClick: null,
            onFileSelect: null,
            onPlayPause: null,
            onSeek: null,
            onShapeChange: null,
            onSensitivityChange: null,
            onRotationChange: null,
            onColorChange: null
        };
        
        this.init();
    }

    /**
     * Initialize UI event listeners
     */
    init() {
        // Hide/Show UI
        this.elements.btnHideUI.addEventListener('click', () => this.hideUI());
        this.elements.btnShowUI.addEventListener('click', () => this.showUI());
        
        // Fullscreen
        this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        
        // Audio source buttons
        this.elements.btnMicrophone.addEventListener('click', () => {
            if (this.callbacks.onMicrophoneClick) {
                this.callbacks.onMicrophoneClick();
            }
        });
        
        this.elements.audioFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.callbacks.onFileSelect) {
                this.callbacks.onFileSelect(file);
            }
        });
        
        // Play/Pause button
        this.elements.btnPlay.addEventListener('click', () => {
            if (this.callbacks.onPlayPause) {
                this.callbacks.onPlayPause();
            }
        });
        
        // Progress bar seeking
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            if (this.callbacks.onSeek) {
                this.callbacks.onSeek(Math.max(0, Math.min(1, position)));
            }
        });
        
        // Visualization settings
        this.elements.selectShape.addEventListener('change', (e) => {
            if (this.callbacks.onShapeChange) {
                this.callbacks.onShapeChange(e.target.value);
            }
        });
        
        this.elements.rangeSensitivity.addEventListener('input', (e) => {
            if (this.callbacks.onSensitivityChange) {
                this.callbacks.onSensitivityChange(parseFloat(e.target.value));
            }
        });
        
        this.elements.rangeRotation.addEventListener('input', (e) => {
            if (this.callbacks.onRotationChange) {
                this.callbacks.onRotationChange(parseFloat(e.target.value));
            }
        });
        
        this.elements.selectColor.addEventListener('change', (e) => {
            if (this.callbacks.onColorChange) {
                this.callbacks.onColorChange(e.target.value);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Fullscreen change event
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        
        console.log('[UIController] Initialized');
    }

    /**
     * Register event callbacks
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
        return this;
    }

    /**
     * Hide UI panel
     */
    hideUI() {
        this.elements.uiPanel.classList.add('hidden');
        this.elements.btnShowUI.classList.remove('hidden');
        this.isUIVisible = false;
    }

    /**
     * Show UI panel
     */
    showUI() {
        this.elements.uiPanel.classList.remove('hidden');
        this.elements.btnShowUI.classList.add('hidden');
        this.isUIVisible = true;
    }

    /**
     * Toggle UI visibility
     */
    toggleUI() {
        if (this.isUIVisible) {
            this.hideUI();
        } else {
            this.showUI();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                // Enter fullscreen
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    await document.documentElement.webkitRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (error) {
            console.error('[UIController] Fullscreen error:', error);
        }
    }

    /**
     * Update fullscreen button state
     */
    updateFullscreenButton() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        const btnText = this.elements.btnFullscreen.querySelector('span');
        if (btnText) {
            btnText.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Don't handle if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case 'h':
                this.toggleUI();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case ' ':
                e.preventDefault();
                if (this.callbacks.onPlayPause) {
                    this.callbacks.onPlayPause();
                }
                break;
        }
    }

    /**
     * Set microphone button active state
     */
    setMicrophoneActive(active) {
        if (active) {
            this.elements.btnMicrophone.classList.add('active');
        } else {
            this.elements.btnMicrophone.classList.remove('active');
        }
    }

    /**
     * Show audio player
     */
    showAudioPlayer(trackInfo) {
        this.elements.audioPlayer.classList.remove('hidden');
        this.elements.trackName.textContent = trackInfo.name || 'Unknown Track';
        this.elements.duration.textContent = this.formatTime(trackInfo.duration || 0);
        this.elements.currentTime.textContent = '0:00';
        this.elements.progressFill.style.width = '0%';
    }

    /**
     * Hide audio player
     */
    hideAudioPlayer() {
        this.elements.audioPlayer.classList.add('hidden');
    }

    /**
     * Update play button state
     */
    setPlayingState(isPlaying) {
        this.isPlaying = isPlaying;
        const playIcon = this.elements.btnPlay.querySelector('.play-icon');
        const pauseIcon = this.elements.btnPlay.querySelector('.pause-icon');
        
        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    /**
     * Update playback progress
     */
    updateProgress(currentTime, duration) {
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.currentTime.textContent = this.formatTime(currentTime);
    }

    /**
     * Update audio stats display
     */
    updateStats(audioData) {
        const { amplitude, bass, mid, treble } = audioData;
        
        // Update values
        this.elements.statAmplitude.textContent = amplitude.toFixed(2);
        this.elements.statBass.textContent = bass.toFixed(2);
        this.elements.statMid.textContent = mid.toFixed(2);
        this.elements.statTreble.textContent = treble.toFixed(2);
        
        // Update bars
        this.elements.barAmplitude.style.width = `${amplitude * 100}%`;
        this.elements.barBass.style.width = `${bass * 100}%`;
        this.elements.barMid.style.width = `${mid * 100}%`;
        this.elements.barTreble.style.width = `${treble * 100}%`;
    }

    /**
     * Format time in M:SS format
     */
    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        // Simple alert for now, could be replaced with custom modal
        console.error('[UIController] Error:', message);
        alert(message);
    }
}
