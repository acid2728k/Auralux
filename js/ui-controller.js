/**
 * UIController Module
 * Minimal UI for Auralux
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
            timeCurrent: document.getElementById('time-current'),
            timeTotal: document.getElementById('time-total'),
            selectGeometry: document.getElementById('select-geometry'),
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
            onRandomize: null
        };

        this.isUIVisible = true;
        this.init();
    }

    init() {
        // Hide/Show UI
        this.elements.btnHide.addEventListener('click', () => this.hideUI());
        this.elements.btnShow.addEventListener('click', () => this.showUI());

        // Fullscreen
        this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

        // Microphone
        this.elements.btnMicrophone.addEventListener('click', () => {
            this.callbacks.onMicrophoneClick?.();
        });

        // File input
        this.elements.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.callbacks.onFileSelect?.(file);
        });

        // Play/Pause
        this.elements.btnPlay.addEventListener('click', () => {
            this.callbacks.onPlayPause?.();
        });

        // Progress seek
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.callbacks.onSeek?.(Math.max(0, Math.min(1, pos)));
        });

        // Geometry select
        this.elements.selectGeometry.addEventListener('change', (e) => {
            this.callbacks.onGeometryChange?.(e.target.value);
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
        if (span) span.textContent = isFs ? 'Exit' : 'Fullscreen';
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
        this.elements.timeTotal.textContent = this.formatTime(trackInfo.duration || 0);
        this.elements.timeCurrent.textContent = '0:00';
        this.elements.progressFill.style.width = '0%';
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
        this.elements.timeCurrent.textContent = this.formatTime(currentTime);
    }

    setGeometrySelect(value) {
        this.elements.selectGeometry.value = value;
    }

    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    hideLoader() {
        this.elements.loader.classList.add('hidden');
    }

    showError(msg) {
        console.error('[UIController]', msg);
        alert(msg);
    }
}
