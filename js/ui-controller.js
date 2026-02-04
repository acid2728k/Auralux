/**
 * UIController Module
 * Extended UI controls for Auralux
 */

export class UIController {
    constructor() {
        this.elements = {
            panel: document.getElementById('ui-panel'),
            btnHide: document.getElementById('btn-hide'),
            btnShow: document.getElementById('btn-show'),
            btnMicrophone: document.getElementById('btn-microphone'),
            audioFile: document.getElementById('audio-file'),
            audioPlayer: document.getElementById('audio-player'),
            trackName: document.getElementById('track-name'),
            btnPlay: document.getElementById('btn-play'),
            progressBar: document.querySelector('.progress-bar'),
            progressFill: document.getElementById('progress-fill'),
            
            // Geometry
            selectGeometry: document.getElementById('select-geometry'),
            rangeDetail: document.getElementById('range-detail'),
            detailValue: document.getElementById('detail-value'),
            
            // Surround
            selectSurround: document.getElementById('select-surround'),
            rangeSurroundCount: document.getElementById('range-surround-count'),
            surroundCountValue: document.getElementById('surround-count-value'),
            rangeSurroundComplexity: document.getElementById('range-surround-complexity'),
            surroundComplexityValue: document.getElementById('surround-complexity-value'),
            
            // Actions
            btnRandomize: document.getElementById('btn-randomize'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            loader: document.getElementById('loader')
        };

        this.callbacks = {
            onMicrophoneClick: null,
            onFileSelect: null,
            onPlayPause: null,
            onSeek: null,
            onGeometryChange: null,
            onDetailChange: null,
            onSurroundTypeChange: null,
            onSurroundCountChange: null,
            onSurroundComplexityChange: null,
            onRandomize: null
        };

        this.isUIVisible = true;
        this.init();
    }

    init() {
        // Hide/Show
        this.elements.btnHide.addEventListener('click', () => this.hideUI());
        this.elements.btnShow.addEventListener('click', () => this.showUI());

        // Fullscreen
        this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

        // Microphone
        this.elements.btnMicrophone.addEventListener('click', () => {
            this.callbacks.onMicrophoneClick?.();
        });

        // File
        this.elements.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.callbacks.onFileSelect?.(file);
        });

        // Play/Pause
        this.elements.btnPlay.addEventListener('click', () => {
            this.callbacks.onPlayPause?.();
        });

        // Progress
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.callbacks.onSeek?.(Math.max(0, Math.min(1, pos)));
        });

        // Geometry
        this.elements.selectGeometry.addEventListener('change', (e) => {
            this.callbacks.onGeometryChange?.(e.target.value);
        });

        // Detail
        this.elements.rangeDetail.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.elements.detailValue.textContent = val;
            this.callbacks.onDetailChange?.(val);
        });

        // Surround Type
        this.elements.selectSurround.addEventListener('change', (e) => {
            this.callbacks.onSurroundTypeChange?.(e.target.value);
        });

        // Surround Count
        this.elements.rangeSurroundCount.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.elements.surroundCountValue.textContent = val;
            this.callbacks.onSurroundCountChange?.(val);
        });

        // Surround Complexity
        this.elements.rangeSurroundComplexity.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.elements.surroundComplexityValue.textContent = val;
            this.callbacks.onSurroundComplexityChange?.(val);
        });

        // Randomize
        this.elements.btnRandomize.addEventListener('click', () => {
            this.callbacks.onRandomize?.();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.updateFullscreenBtn());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenBtn());

        console.log('[UIController] Initialized');
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
        return this;
    }

    hideUI() {
        this.elements.panel.classList.add('hidden');
        this.elements.btnShow.classList.remove('hidden');
        this.isUIVisible = false;
    }

    showUI() {
        this.elements.panel.classList.remove('hidden');
        this.elements.btnShow.classList.add('hidden');
        this.isUIVisible = true;
    }

    toggleUI() {
        this.isUIVisible ? this.hideUI() : this.showUI();
    }

    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    await document.documentElement.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.error('[UIController] Fullscreen error:', err);
        }
    }

    updateFullscreenBtn() {
        const isFs = document.fullscreenElement || document.webkitFullscreenElement;
        const span = this.elements.btnFullscreen.querySelector('span');
        if (span) span.textContent = isFs ? 'Exit' : 'Full';
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.key.toLowerCase()) {
            case 'h':
                this.toggleUI();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case ' ':
                e.preventDefault();
                this.callbacks.onPlayPause?.();
                break;
            case 'r':
                this.callbacks.onRandomize?.();
                break;
        }
    }

    setMicrophoneActive(active) {
        this.elements.btnMicrophone.classList.toggle('active', active);
    }

    showAudioPlayer(trackInfo) {
        this.elements.audioPlayer.classList.remove('hidden');
        this.elements.trackName.textContent = trackInfo.name || '—';
    }

    hideAudioPlayer() {
        this.elements.audioPlayer.classList.add('hidden');
    }

    setPlayingState(isPlaying) {
        const playIcon = this.elements.btnPlay.querySelector('.icon-play');
        const pauseIcon = this.elements.btnPlay.querySelector('.icon-pause');
        playIcon.classList.toggle('hidden', isPlaying);
        pauseIcon.classList.toggle('hidden', !isPlaying);
    }

    updateProgress(currentTime, duration) {
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        this.elements.progressFill.style.width = `${progress}%`;
    }

    // Update UI from randomize
    setGeometrySelect(value) {
        this.elements.selectGeometry.value = value;
    }

    setDetailValue(value) {
        this.elements.rangeDetail.value = value;
        this.elements.detailValue.textContent = value;
    }

    setSurroundSelect(value) {
        this.elements.selectSurround.value = value;
    }

    hideLoader() {
        this.elements.loader.classList.add('hidden');
    }

    showError(msg) {
        console.error('[UIController]', msg);
        alert(msg);
    }
}
