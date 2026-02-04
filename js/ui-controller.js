/**
 * UIController Module - Extended
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
            rangeBgSpeed: document.getElementById('range-bg-speed'),
            bgSpeedValue: document.getElementById('bg-speed-value'),
            
            selectLightMode: document.getElementById('select-light-mode'),
            rangeBrightness: document.getElementById('range-brightness'),
            brightnessValue: document.getElementById('brightness-value'),
            rangeLightComplexity: document.getElementById('range-light-complexity'),
            lightComplexityValue: document.getElementById('light-complexity-value'),
            
            rangeDepth: document.getElementById('range-depth'),
            depthValue: document.getElementById('depth-value'),
            rangeBloom: document.getElementById('range-bloom'),
            bloomValue: document.getElementById('bloom-value'),
            rangeFog: document.getElementById('range-fog'),
            fogValue: document.getElementById('fog-value'),
            
            btnRandomize: document.getElementById('btn-randomize'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            loader: document.getElementById('loader')
        };

        this.callbacks = {};
        this.isUIVisible = true;
        this.init();
    }

    init() {
        // UI visibility
        this.elements.btnHide.addEventListener('click', () => this.hideUI());
        this.elements.btnShow.addEventListener('click', () => this.showUI());
        this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

        // Audio
        this.elements.btnMicrophone.addEventListener('click', () => this.emit('onMicrophoneClick'));
        this.elements.audioFile.addEventListener('change', (e) => {
            if (e.target.files[0]) this.emit('onFileSelect', e.target.files[0]);
        });
        this.elements.btnPlay.addEventListener('click', () => this.emit('onPlayPause'));
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = this.elements.progressBar.getBoundingClientRect();
            this.emit('onSeek', Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
        });

        // Geometry
        this.bindSelect('selectGeometry', 'onGeometryChange');
        this.bindRange('rangeDetail', 'detailValue', 'onDetailChange', true);

        // Rings
        this.bindSelect('selectRings', 'onRingsStyleChange');
        this.bindRange('rangeRingsCount', 'ringsCountValue', 'onRingsCountChange', true);

        // Surround
        this.bindSelect('selectSurround', 'onSurroundTypeChange');
        this.bindRange('rangeSurroundCount', 'surroundCountValue', 'onSurroundCountChange', true);

        // Background
        this.bindSelect('selectBackground', 'onBackgroundTypeChange');
        this.bindRange('rangeBgDensity', 'bgDensityValue', 'onBackgroundDensityChange', true);
        this.bindRange('rangeBgSpeed', 'bgSpeedValue', 'onBackgroundSpeedChange', false);

        // Lighting
        this.bindSelect('selectLightMode', 'onLightModeChange');
        this.bindRange('rangeBrightness', 'brightnessValue', 'onBrightnessChange', false);
        this.bindRange('rangeLightComplexity', 'lightComplexityValue', 'onLightComplexityChange', true);

        // Scene
        this.bindRange('rangeDepth', 'depthValue', 'onDepthChange', false);
        this.bindRange('rangeBloom', 'bloomValue', 'onBloomChange', false);
        this.bindRange('rangeFog', 'fogValue', 'onFogChange', false);

        // Randomize
        this.elements.btnRandomize.addEventListener('click', () => this.emit('onRandomize'));

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        document.addEventListener('fullscreenchange', () => this.updateFullscreenBtn());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenBtn());
    }

    bindSelect(elementKey, callbackKey) {
        this.elements[elementKey]?.addEventListener('change', (e) => this.emit(callbackKey, e.target.value));
    }

    bindRange(rangeKey, valueKey, callbackKey, isInt) {
        this.elements[rangeKey]?.addEventListener('input', (e) => {
            const val = isInt ? parseInt(e.target.value) : parseFloat(e.target.value);
            if (this.elements[valueKey]) this.elements[valueKey].textContent = isInt ? val : val.toFixed(1);
            this.emit(callbackKey, val);
        });
    }

    on(event, callback) { this.callbacks[event] = callback; return this; }
    emit(event, ...args) { this.callbacks[event]?.(...args); }

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
            case ' ': e.preventDefault(); this.emit('onPlayPause'); break;
            case 'r': this.emit('onRandomize'); break;
        }
    }

    // Audio
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
    setGeometrySelect(v) { if (this.elements.selectGeometry) this.elements.selectGeometry.value = v; }
    setDetailValue(v) {
        if (this.elements.rangeDetail) this.elements.rangeDetail.value = v;
        if (this.elements.detailValue) this.elements.detailValue.textContent = v;
    }
    setRingsSelect(v) { if (this.elements.selectRings) this.elements.selectRings.value = v; }
    setSurroundSelect(v) { if (this.elements.selectSurround) this.elements.selectSurround.value = v; }
    setBackgroundSelect(v) { if (this.elements.selectBackground) this.elements.selectBackground.value = v; }
    setLightModeSelect(v) { if (this.elements.selectLightMode) this.elements.selectLightMode.value = v; }

    hideLoader() { this.elements.loader.classList.add('hidden'); }
    showError(msg) { console.error('[UI]', msg); alert(msg); }
}
