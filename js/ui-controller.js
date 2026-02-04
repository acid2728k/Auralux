/**
 * UIController Module
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
            
            selectGeometry: document.getElementById('select-geometry'),
            rangeDetail: document.getElementById('range-detail'),
            detailValue: document.getElementById('detail-value'),
            
            selectRings: document.getElementById('select-rings'),
            rangeRingsCount: document.getElementById('range-rings-count'),
            ringsCountValue: document.getElementById('rings-count-value'),
            
            selectSurround: document.getElementById('select-surround'),
            rangeSurroundCount: document.getElementById('range-surround-count'),
            surroundCountValue: document.getElementById('surround-count-value'),
            
            selectBackground: document.getElementById('select-background'),
            rangeBgDensity: document.getElementById('range-bg-density'),
            bgDensityValue: document.getElementById('bg-density-value'),
            
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
            onRingsStyleChange: null,
            onRingsCountChange: null,
            onSurroundTypeChange: null,
            onSurroundCountChange: null,
            onBackgroundTypeChange: null,
            onBackgroundDensityChange: null,
            onRandomize: null
        };

        this.isUIVisible = true;
        this.init();
    }

    init() {
        this.elements.btnHide.addEventListener('click', () => this.hideUI());
        this.elements.btnShow.addEventListener('click', () => this.showUI());
        this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

        this.elements.btnMicrophone.addEventListener('click', () => this.callbacks.onMicrophoneClick?.());
        this.elements.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.callbacks.onFileSelect?.(file);
        });
        this.elements.btnPlay.addEventListener('click', () => this.callbacks.onPlayPause?.());
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            this.callbacks.onSeek?.(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
        });

        // Geometry
        this.elements.selectGeometry.addEventListener('change', (e) => this.callbacks.onGeometryChange?.(e.target.value));
        this.elements.rangeDetail.addEventListener('input', (e) => {
            this.elements.detailValue.textContent = e.target.value;
            this.callbacks.onDetailChange?.(parseInt(e.target.value));
        });

        // Rings
        this.elements.selectRings.addEventListener('change', (e) => this.callbacks.onRingsStyleChange?.(e.target.value));
        this.elements.rangeRingsCount.addEventListener('input', (e) => {
            this.elements.ringsCountValue.textContent = e.target.value;
            this.callbacks.onRingsCountChange?.(parseInt(e.target.value));
        });

        // Surround
        this.elements.selectSurround.addEventListener('change', (e) => this.callbacks.onSurroundTypeChange?.(e.target.value));
        this.elements.rangeSurroundCount.addEventListener('input', (e) => {
            this.elements.surroundCountValue.textContent = e.target.value;
            this.callbacks.onSurroundCountChange?.(parseInt(e.target.value));
        });

        // Background
        this.elements.selectBackground.addEventListener('change', (e) => this.callbacks.onBackgroundTypeChange?.(e.target.value));
        this.elements.rangeBgDensity.addEventListener('input', (e) => {
            this.elements.bgDensityValue.textContent = e.target.value;
            this.callbacks.onBackgroundDensityChange?.(parseInt(e.target.value));
        });

        this.elements.btnRandomize.addEventListener('click', () => this.callbacks.onRandomize?.());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        document.addEventListener('fullscreenchange', () => this.updateFullscreenBtn());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenBtn());
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) this.callbacks[event] = callback;
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

    toggleUI() { this.isUIVisible ? this.hideUI() : this.showUI(); }

    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                await (document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.());
            } else {
                await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
            }
        } catch (err) { console.error('[UI] Fullscreen error:', err); }
    }

    updateFullscreenBtn() {
        const isFs = document.fullscreenElement || document.webkitFullscreenElement;
        const span = this.elements.btnFullscreen.querySelector('span');
        if (span) span.textContent = isFs ? 'Exit' : 'Full';
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        switch (e.key.toLowerCase()) {
            case 'h': this.toggleUI(); break;
            case 'f': this.toggleFullscreen(); break;
            case ' ': e.preventDefault(); this.callbacks.onPlayPause?.(); break;
            case 'r': this.callbacks.onRandomize?.(); break;
        }
    }

    setMicrophoneActive(active) { this.elements.btnMicrophone.classList.toggle('active', active); }
    
    showAudioPlayer(info) {
        this.elements.audioPlayer.classList.remove('hidden');
        this.elements.trackName.textContent = info.name || '—';
    }
    
    hideAudioPlayer() { this.elements.audioPlayer.classList.add('hidden'); }
    
    setPlayingState(playing) {
        this.elements.btnPlay.querySelector('.icon-play').classList.toggle('hidden', playing);
        this.elements.btnPlay.querySelector('.icon-pause').classList.toggle('hidden', !playing);
    }
    
    updateProgress(current, total) {
        this.elements.progressFill.style.width = `${total > 0 ? (current / total) * 100 : 0}%`;
    }

    // Update UI from randomize
    setGeometrySelect(v) { this.elements.selectGeometry.value = v; }
    setDetailValue(v) { this.elements.rangeDetail.value = v; this.elements.detailValue.textContent = v; }
    setRingsSelect(v) { this.elements.selectRings.value = v; }
    setSurroundSelect(v) { this.elements.selectSurround.value = v; }
    setBackgroundSelect(v) { this.elements.selectBackground.value = v; }

    hideLoader() { this.elements.loader.classList.add('hidden'); }
    showError(msg) { console.error('[UI]', msg); alert(msg); }
}
