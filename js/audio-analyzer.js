/**
 * AudioAnalyzer Module
 * Handles Web Audio API integration and real-time audio analysis
 */

export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.frequencyData = null;
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;
        
        // Audio element for file playback
        this.audioElement = null;
        
        // Stream for microphone
        this.microphoneStream = null;
        
        // Analysis results
        this.analysis = {
            amplitude: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            peak: 0,
            frequencies: [],
            waveform: []
        };
        
        // Peak detection
        this.peakHistory = [];
        this.peakThreshold = 0.7;
        this.lastPeakTime = 0;
        this.isPeak = false;
        
        // State
        this.isInitialized = false;
        this.sourceType = null; // 'microphone' | 'file'
    }

    /**
     * Initialize the audio context
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.frequencyData = new Uint8Array(bufferLength);
            
            this.isInitialized = true;
            console.log('[AudioAnalyzer] Initialized successfully');
        } catch (error) {
            console.error('[AudioAnalyzer] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Connect microphone as audio source
     */
    async connectMicrophone() {
        await this.init();
        this.disconnect();
        
        try {
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            this.source = this.audioContext.createMediaStreamSource(this.microphoneStream);
            this.source.connect(this.analyser);
            // Don't connect to destination to avoid feedback
            
            this.sourceType = 'microphone';
            console.log('[AudioAnalyzer] Microphone connected');
            
            return true;
        } catch (error) {
            console.error('[AudioAnalyzer] Microphone access denied:', error);
            throw error;
        }
    }

    /**
     * Connect audio file as source
     */
    async connectAudioFile(file) {
        await this.init();
        this.disconnect();
        
        try {
            // Create audio element
            this.audioElement = new Audio();
            this.audioElement.crossOrigin = 'anonymous';
            
            // Create object URL for the file
            const objectUrl = URL.createObjectURL(file);
            this.audioElement.src = objectUrl;
            
            // Wait for metadata to load
            await new Promise((resolve, reject) => {
                this.audioElement.addEventListener('loadedmetadata', resolve, { once: true });
                this.audioElement.addEventListener('error', reject, { once: true });
            });
            
            // Create media element source
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.sourceType = 'file';
            console.log('[AudioAnalyzer] Audio file connected:', file.name);
            
            return {
                name: file.name,
                duration: this.audioElement.duration
            };
        } catch (error) {
            console.error('[AudioAnalyzer] Failed to load audio file:', error);
            throw error;
        }
    }

    /**
     * Disconnect current audio source
     */
    disconnect() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
        }
        
        this.sourceType = null;
    }

    /**
     * Play audio (for file source only)
     */
    play() {
        if (this.audioElement && this.audioContext) {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.audioElement.play();
        }
    }

    /**
     * Pause audio (for file source only)
     */
    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.audioElement) {
            if (this.audioElement.paused) {
                this.play();
                return true;
            } else {
                this.pause();
                return false;
            }
        }
        return false;
    }

    /**
     * Seek to position (0-1)
     */
    seek(position) {
        if (this.audioElement) {
            this.audioElement.currentTime = position * this.audioElement.duration;
        }
    }

    /**
     * Get current playback time
     */
    getCurrentTime() {
        return this.audioElement ? this.audioElement.currentTime : 0;
    }

    /**
     * Get total duration
     */
    getDuration() {
        return this.audioElement ? this.audioElement.duration : 0;
    }

    /**
     * Check if audio is playing
     */
    isPlaying() {
        return this.audioElement ? !this.audioElement.paused : false;
    }

    /**
     * Analyze current audio frame
     */
    analyze() {
        if (!this.analyser || !this.dataArray) {
            return this.analysis;
        }
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        // Get waveform data
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Calculate amplitude from waveform
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const value = (this.dataArray[i] - 128) / 128;
            sum += value * value;
        }
        this.analysis.amplitude = Math.sqrt(sum / this.dataArray.length);
        
        // Calculate frequency bands
        const frequencyBins = this.frequencyData.length;
        
        // Bass: 20-250 Hz (roughly first 10% of bins)
        const bassEnd = Math.floor(frequencyBins * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) {
            bassSum += this.frequencyData[i];
        }
        this.analysis.bass = bassSum / (bassEnd * 255);
        
        // Mid: 250-4000 Hz (roughly 10%-40% of bins)
        const midStart = bassEnd;
        const midEnd = Math.floor(frequencyBins * 0.4);
        let midSum = 0;
        for (let i = midStart; i < midEnd; i++) {
            midSum += this.frequencyData[i];
        }
        this.analysis.mid = midSum / ((midEnd - midStart) * 255);
        
        // Treble: 4000-20000 Hz (roughly 40%-100% of bins)
        const trebleStart = midEnd;
        let trebleSum = 0;
        for (let i = trebleStart; i < frequencyBins; i++) {
            trebleSum += this.frequencyData[i];
        }
        this.analysis.treble = trebleSum / ((frequencyBins - trebleStart) * 255);
        
        // Peak detection
        this.detectPeak();
        
        // Store normalized frequency data
        this.analysis.frequencies = Array.from(this.frequencyData).map(v => v / 255);
        
        // Store normalized waveform
        this.analysis.waveform = Array.from(this.dataArray).map(v => (v - 128) / 128);
        
        return this.analysis;
    }

    /**
     * Detect audio peaks (for beat detection)
     */
    detectPeak() {
        const now = performance.now();
        const energy = this.analysis.bass * 0.6 + this.analysis.mid * 0.3 + this.analysis.treble * 0.1;
        
        // Add to history
        this.peakHistory.push(energy);
        if (this.peakHistory.length > 43) { // ~43 frames at 60fps ≈ 700ms window
            this.peakHistory.shift();
        }
        
        // Calculate average energy
        const avgEnergy = this.peakHistory.reduce((a, b) => a + b, 0) / this.peakHistory.length;
        
        // Detect peak if current energy exceeds threshold above average
        const timeSinceLastPeak = now - this.lastPeakTime;
        if (energy > avgEnergy * (1 + this.peakThreshold) && timeSinceLastPeak > 200) {
            this.isPeak = true;
            this.lastPeakTime = now;
            this.analysis.peak = 1;
        } else {
            this.isPeak = false;
            this.analysis.peak = Math.max(0, this.analysis.peak - 0.1);
        }
    }

    /**
     * Resume audio context (needed after user interaction)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Get audio element for event binding
     */
    getAudioElement() {
        return this.audioElement;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.disconnect();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isInitialized = false;
    }
}
