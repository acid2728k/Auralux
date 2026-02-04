/**
 * Visualizer Module
 * Three.js based reactive 3D visualization
 * Central element + Surrounding elements + Audio band
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Visualization components
        this.centerElement = null;
        this.surroundElements = [];
        this.audioBand = null;
        this.audioBandElements = [];
        
        // Settings
        this.settings = {
            sensitivity: 1.5,
            rotationSpeed: 0.3,
            centerShape: 'ring',
            centerSize: 1,
            centerColor: 'gradient',
            surroundType: 'rays',
            surroundDensity: 1,
            bandStyle: 'waveform',
            bandIntensity: 1.5
        };
        
        // Color definitions
        this.colors = {
            gradient: [
                new THREE.Color(0xa855f7), // Purple
                new THREE.Color(0x06b6d4), // Cyan
                new THREE.Color(0xff6b2c)  // Orange
            ],
            purple: [new THREE.Color(0xa855f7), new THREE.Color(0xc084fc)],
            cyan: [new THREE.Color(0x06b6d4), new THREE.Color(0x67e8f9)],
            orange: [new THREE.Color(0xff6b2c), new THREE.Color(0xffa500)],
            white: [new THREE.Color(0xffffff), new THREE.Color(0xcccccc)]
        };
        
        // Animation state
        this.time = 0;
        this.audioData = null;
        
        this.init();
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.z = 40;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0xffffff, 1, 100);
        pointLight1.position.set(0, 0, 30);
        this.scene.add(pointLight1);
        
        // Create visualization elements
        this.createCenterElement();
        this.createSurroundElements();
        this.createAudioBand();
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        console.log('[Visualizer] Initialized');
    }

    /**
     * Handle window resize
     */
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    /**
     * Get color from current palette
     */
    getColor(t, colorName = null) {
        const palette = this.colors[colorName || this.settings.centerColor] || this.colors.gradient;
        const index = Math.floor(t * (palette.length - 1));
        const nextIndex = Math.min(index + 1, palette.length - 1);
        const blend = (t * (palette.length - 1)) % 1;
        
        return palette[index].clone().lerp(palette[nextIndex], blend);
    }

    // =====================================================
    // CENTER ELEMENT
    // =====================================================

    createCenterElement() {
        if (this.centerElement) {
            this.scene.remove(this.centerElement);
            if (this.centerElement.geometry) this.centerElement.geometry.dispose();
            if (this.centerElement.material) this.centerElement.material.dispose();
        }

        const size = 8 * this.settings.centerSize;
        let geometry;

        switch (this.settings.centerShape) {
            case 'ring':
                geometry = new THREE.TorusGeometry(size, size * 0.15, 64, 128);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(size * 0.8, 64, 64);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(size * 0.7, size * 0.3, 32, 64);
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(size * 0.9, 0);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(size * 0.85, 0);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(size * 0.85, 0);
                break;
            default:
                geometry = new THREE.TorusGeometry(size, size * 0.15, 64, 128);
        }

        const color = this.getColor(0.5);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9,
            shininess: 100,
            side: THREE.DoubleSide
        });

        this.centerElement = new THREE.Mesh(geometry, material);
        this.centerElement.userData = {
            baseScale: 1,
            rotationSpeed: { x: 0, y: 0.001, z: 0 }
        };
        
        this.scene.add(this.centerElement);
    }

    updateCenterElement(audioData, delta) {
        if (!this.centerElement) return;

        const { amplitude, bass, mid } = audioData;
        const sensitivity = this.settings.sensitivity;
        
        // Pulse scale
        const targetScale = 1 + bass * 0.3 * sensitivity;
        this.centerElement.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            0.1
        );

        // Rotation
        const rotSpeed = this.settings.rotationSpeed;
        this.centerElement.rotation.z += delta * rotSpeed * (1 + amplitude * 0.5);
        
        if (this.settings.centerShape !== 'ring') {
            this.centerElement.rotation.x += delta * rotSpeed * 0.3;
            this.centerElement.rotation.y += delta * rotSpeed * 0.5;
        }

        // Update color
        const colorT = (Math.sin(this.time * 0.5) + 1) / 2;
        const newColor = this.getColor(colorT);
        this.centerElement.material.color.lerp(newColor, 0.05);
        this.centerElement.material.emissive.lerp(newColor, 0.05);
        this.centerElement.material.emissiveIntensity = 0.2 + amplitude * 0.4 * sensitivity;
    }

    // =====================================================
    // SURROUNDING ELEMENTS
    // =====================================================

    createSurroundElements() {
        // Clear existing
        this.surroundElements.forEach(el => {
            this.scene.remove(el);
            if (el.geometry) el.geometry.dispose();
            if (el.material) {
                if (Array.isArray(el.material)) {
                    el.material.forEach(m => m.dispose());
                } else {
                    el.material.dispose();
                }
            }
        });
        this.surroundElements = [];

        if (this.settings.surroundType === 'none') return;

        const density = this.settings.surroundDensity;

        switch (this.settings.surroundType) {
            case 'rays':
                this.createRays(density);
                break;
            case 'particles':
                this.createParticles(density);
                break;
            case 'rings':
                this.createRings(density);
                break;
            case 'dots':
                this.createDots(density);
                break;
            case 'waves':
                this.createWaves(density);
                break;
        }
    }

    createRays(density) {
        const count = Math.floor(64 * density);
        const baseRadius = 12;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const length = 3 + Math.random() * 4;
            
            const geometry = new THREE.PlaneGeometry(0.15, length);
            const material = new THREE.MeshBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const ray = new THREE.Mesh(geometry, material);
            ray.position.x = Math.cos(angle) * baseRadius;
            ray.position.y = Math.sin(angle) * baseRadius;
            ray.rotation.z = angle - Math.PI / 2;
            
            ray.userData = {
                angle: angle,
                baseRadius: baseRadius,
                baseLength: length,
                index: i
            };

            this.surroundElements.push(ray);
            this.scene.add(ray);
        }
    }

    createParticles(density) {
        const count = Math.floor(300 * density);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 15;
            const y = (Math.random() - 0.5) * 8;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            const color = this.getColor(Math.random());
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.3 + Math.random() * 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        geometry.userData = {
            originalPositions: positions.slice(),
            angles: Array.from({ length: count }, (_, i) => {
                const x = positions[i * 3];
                const z = positions[i * 3 + 2];
                return Math.atan2(z, x);
            })
        };

        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        this.surroundElements.push(particles);
        this.scene.add(particles);
    }

    createRings(density) {
        const count = Math.floor(5 * density);
        
        for (let i = 0; i < count; i++) {
            const radius = 12 + i * 3;
            const geometry = new THREE.RingGeometry(radius, radius + 0.1, 128);
            const material = new THREE.MeshBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.4 - i * 0.05,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const ring = new THREE.Mesh(geometry, material);
            ring.userData = {
                baseRadius: radius,
                index: i
            };

            this.surroundElements.push(ring);
            this.scene.add(ring);
        }
    }

    createDots(density) {
        const countPerRing = Math.floor(32 * density);
        const rings = 3;

        for (let r = 0; r < rings; r++) {
            const radius = 12 + r * 4;
            for (let i = 0; i < countPerRing; i++) {
                const angle = (i / countPerRing) * Math.PI * 2;
                
                const geometry = new THREE.SphereGeometry(0.2 + r * 0.05, 8, 8);
                const material = new THREE.MeshBasicMaterial({
                    color: this.getColor((i + r * countPerRing) / (countPerRing * rings)),
                    transparent: true,
                    opacity: 0.8
                });

                const dot = new THREE.Mesh(geometry, material);
                dot.position.x = Math.cos(angle) * radius;
                dot.position.y = Math.sin(angle) * radius;

                dot.userData = {
                    angle: angle,
                    baseRadius: radius,
                    ring: r,
                    index: i
                };

                this.surroundElements.push(dot);
                this.scene.add(dot);
            }
        }
    }

    createWaves(density) {
        const count = Math.floor(3 * density);

        for (let i = 0; i < count; i++) {
            const radius = 14 + i * 2;
            const points = [];
            const segments = 128;

            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                points.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    0
                ));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
            });

            const wave = new THREE.Line(geometry, material);
            wave.userData = {
                baseRadius: radius,
                segments: segments,
                index: i
            };

            this.surroundElements.push(wave);
            this.scene.add(wave);
        }
    }

    updateSurroundElements(audioData, delta) {
        const { amplitude, bass, mid, treble, frequencies } = audioData;
        const sensitivity = this.settings.sensitivity;

        switch (this.settings.surroundType) {
            case 'rays':
                this.surroundElements.forEach((ray, i) => {
                    const freqIndex = Math.floor((i / this.surroundElements.length) * frequencies.length * 0.5);
                    const freqValue = frequencies[freqIndex] || 0;
                    
                    // Scale ray length
                    const newLength = ray.userData.baseLength * (1 + freqValue * 2 * sensitivity);
                    ray.scale.y = newLength / ray.userData.baseLength;
                    
                    // Push outward
                    const pushRadius = ray.userData.baseRadius + freqValue * 5 * sensitivity;
                    ray.position.x = Math.cos(ray.userData.angle) * pushRadius;
                    ray.position.y = Math.sin(ray.userData.angle) * pushRadius;
                    
                    // Update opacity
                    ray.material.opacity = 0.4 + freqValue * 0.6;
                    
                    // Update color
                    const colorT = (i / this.surroundElements.length + this.time * 0.1) % 1;
                    ray.material.color.copy(this.getColor(colorT));
                });
                break;

            case 'particles':
                if (this.surroundElements[0] && this.surroundElements[0].isPoints) {
                    const particles = this.surroundElements[0];
                    const positions = particles.geometry.attributes.position.array;
                    const originalPositions = particles.geometry.userData.originalPositions;
                    const colors = particles.geometry.attributes.color.array;
                    const count = positions.length / 3;

                    for (let i = 0; i < count; i++) {
                        const freqIndex = Math.floor((i / count) * frequencies.length * 0.3);
                        const freqValue = frequencies[freqIndex] || 0;
                        
                        // Expand based on frequency
                        const expansion = 1 + freqValue * sensitivity * 0.5;
                        positions[i * 3] = originalPositions[i * 3] * expansion;
                        positions[i * 3 + 1] = originalPositions[i * 3 + 1] + 
                            Math.sin(this.time * 2 + i * 0.1) * amplitude * 2;
                        positions[i * 3 + 2] = originalPositions[i * 3 + 2] * expansion;

                        // Update color
                        const colorT = (i / count + this.time * 0.05) % 1;
                        const newColor = this.getColor(colorT);
                        colors[i * 3] = newColor.r;
                        colors[i * 3 + 1] = newColor.g;
                        colors[i * 3 + 2] = newColor.b;
                    }

                    particles.geometry.attributes.position.needsUpdate = true;
                    particles.geometry.attributes.color.needsUpdate = true;
                    particles.material.size = 0.3 + amplitude * 0.5 * sensitivity;
                    particles.rotation.z += delta * 0.1;
                }
                break;

            case 'rings':
                this.surroundElements.forEach((ring, i) => {
                    const freqValue = i === 0 ? bass : (i === 1 ? mid : treble);
                    ring.scale.setScalar(1 + freqValue * 0.3 * sensitivity);
                    ring.material.opacity = 0.2 + freqValue * 0.4;
                    ring.rotation.z += delta * 0.1 * (i + 1);
                });
                break;

            case 'dots':
                this.surroundElements.forEach((dot, i) => {
                    const freqIndex = Math.floor((i / this.surroundElements.length) * frequencies.length * 0.4);
                    const freqValue = frequencies[freqIndex] || 0;
                    
                    // Push outward
                    const pushRadius = dot.userData.baseRadius + freqValue * 4 * sensitivity;
                    const animAngle = dot.userData.angle + this.time * 0.2 * (dot.userData.ring + 1);
                    dot.position.x = Math.cos(animAngle) * pushRadius;
                    dot.position.y = Math.sin(animAngle) * pushRadius;
                    
                    // Scale
                    const scale = 1 + freqValue * 2 * sensitivity;
                    dot.scale.setScalar(scale);
                });
                break;

            case 'waves':
                this.surroundElements.forEach((wave, waveIndex) => {
                    const positions = wave.geometry.attributes.position.array;
                    const segments = wave.userData.segments;
                    
                    for (let j = 0; j <= segments; j++) {
                        const angle = (j / segments) * Math.PI * 2;
                        const freqIndex = Math.floor((j / segments) * frequencies.length * 0.5);
                        const freqValue = frequencies[freqIndex] || 0;
                        
                        const radius = wave.userData.baseRadius + 
                            freqValue * 4 * sensitivity +
                            Math.sin(angle * 8 + this.time * 3) * amplitude * 0.5;
                        
                        positions[j * 3] = Math.cos(angle) * radius;
                        positions[j * 3 + 1] = Math.sin(angle) * radius;
                    }
                    
                    wave.geometry.attributes.position.needsUpdate = true;
                    wave.rotation.z += delta * 0.05 * (waveIndex + 1);
                });
                break;
        }
    }

    // =====================================================
    // AUDIO BAND
    // =====================================================

    createAudioBand() {
        // Clear existing
        this.audioBandElements.forEach(el => {
            this.scene.remove(el);
            if (el.geometry) el.geometry.dispose();
            if (el.material) el.material.dispose();
        });
        this.audioBandElements = [];

        if (this.settings.bandStyle === 'none') return;

        switch (this.settings.bandStyle) {
            case 'waveform':
                this.createWaveformBand();
                break;
            case 'bars':
                this.createBarsBand();
                break;
            case 'line':
                this.createLineBand();
                break;
            case 'mirror':
                this.createMirrorBand();
                break;
            case 'circular':
                this.createCircularBand();
                break;
        }
    }

    createWaveformBand() {
        const width = 30;
        const segments = 128;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            points.push(new THREE.Vector3(
                (i / segments - 0.5) * width,
                0,
                0
            ));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { segments, width };
        this.audioBandElements.push(line);
        this.scene.add(line);

        // Add glow line
        const glowMaterial = new THREE.LineBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            linewidth: 3
        });
        const glowLine = new THREE.Line(geometry.clone(), glowMaterial);
        glowLine.userData = { segments, width, isGlow: true };
        this.audioBandElements.push(glowLine);
        this.scene.add(glowLine);
    }

    createBarsBand() {
        const count = 64;
        const width = 30;
        const barWidth = width / count * 0.8;

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.PlaneGeometry(barWidth, 1);
            const material = new THREE.MeshBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = (i / count - 0.5) * width + barWidth / 2;
            bar.userData = { index: i, baseHeight: 1 };

            this.audioBandElements.push(bar);
            this.scene.add(bar);
        }
    }

    createLineBand() {
        const width = 35;
        const geometry = new THREE.PlaneGeometry(width, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const line = new THREE.Mesh(geometry, material);
        line.userData = { width };
        this.audioBandElements.push(line);
        this.scene.add(line);

        // Add particles along the line
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * width;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x06b6d4,
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.userData = { isParticles: true };
        this.audioBandElements.push(particles);
        this.scene.add(particles);
    }

    createMirrorBand() {
        const count = 64;
        const width = 30;
        const barWidth = width / count * 0.7;

        for (let i = 0; i < count; i++) {
            // Top bar
            const geometryTop = new THREE.PlaneGeometry(barWidth, 1);
            const materialTop = new THREE.MeshBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const barTop = new THREE.Mesh(geometryTop, materialTop);
            barTop.position.x = (i / count - 0.5) * width + barWidth / 2;
            barTop.userData = { index: i, isTop: true };
            this.audioBandElements.push(barTop);
            this.scene.add(barTop);

            // Bottom bar (mirror)
            const barBottom = new THREE.Mesh(geometryTop.clone(), materialTop.clone());
            barBottom.position.x = barTop.position.x;
            barBottom.userData = { index: i, isTop: false };
            this.audioBandElements.push(barBottom);
            this.scene.add(barBottom);
        }
    }

    createCircularBand() {
        const count = 64;
        const radius = 9;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const geometry = new THREE.PlaneGeometry(0.2, 1);
            const material = new THREE.MeshBasicMaterial({
                color: this.getColor(i / count),
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = Math.cos(angle) * radius;
            bar.position.y = Math.sin(angle) * radius;
            bar.rotation.z = angle + Math.PI / 2;
            bar.userData = { angle, radius, index: i };

            this.audioBandElements.push(bar);
            this.scene.add(bar);
        }
    }

    updateAudioBand(audioData, delta) {
        const { amplitude, frequencies, waveform } = audioData;
        const intensity = this.settings.bandIntensity;
        const sensitivity = this.settings.sensitivity;

        switch (this.settings.bandStyle) {
            case 'waveform':
                this.audioBandElements.forEach(line => {
                    if (!line.geometry || !line.geometry.attributes) return;
                    
                    const positions = line.geometry.attributes.position.array;
                    const segments = line.userData.segments;
                    
                    for (let i = 0; i <= segments; i++) {
                        const waveIndex = Math.floor((i / segments) * waveform.length);
                        const waveValue = waveform[waveIndex] || 0;
                        positions[i * 3 + 1] = waveValue * 4 * intensity * sensitivity;
                    }
                    
                    line.geometry.attributes.position.needsUpdate = true;
                    
                    // Update color
                    const hue = (this.time * 0.1) % 1;
                    line.material.color.setHSL(hue * 0.3 + 0.5, 0.8, 0.6);
                });
                break;

            case 'bars':
                this.audioBandElements.forEach((bar, i) => {
                    const freqIndex = Math.floor((i / this.audioBandElements.length) * frequencies.length * 0.5);
                    const freqValue = frequencies[freqIndex] || 0;
                    
                    const height = 0.5 + freqValue * 6 * intensity * sensitivity;
                    bar.scale.y = height;
                    bar.position.y = height / 2;
                    
                    bar.material.opacity = 0.4 + freqValue * 0.6;
                    
                    const colorT = (i / this.audioBandElements.length + this.time * 0.1) % 1;
                    bar.material.color.copy(this.getColor(colorT));
                });
                break;

            case 'line':
                this.audioBandElements.forEach(el => {
                    if (el.userData.isParticles) {
                        const positions = el.geometry.attributes.position.array;
                        const count = positions.length / 3;
                        
                        for (let i = 0; i < count; i++) {
                            const freqIndex = Math.floor(Math.abs(positions[i * 3]) / 15 * frequencies.length * 0.3);
                            const freqValue = frequencies[freqIndex] || 0;
                            positions[i * 3 + 1] = (Math.random() - 0.5) * freqValue * 4 * intensity;
                        }
                        
                        el.geometry.attributes.position.needsUpdate = true;
                        el.material.size = 0.2 + amplitude * 0.4;
                    } else {
                        el.scale.y = 1 + amplitude * 3 * intensity;
                    }
                });
                break;

            case 'mirror':
                this.audioBandElements.forEach((bar) => {
                    const i = bar.userData.index;
                    const freqIndex = Math.floor((i / 64) * frequencies.length * 0.5);
                    const freqValue = frequencies[freqIndex] || 0;
                    
                    const height = 0.3 + freqValue * 4 * intensity * sensitivity;
                    bar.scale.y = height;
                    
                    if (bar.userData.isTop) {
                        bar.position.y = height / 2;
                    } else {
                        bar.position.y = -height / 2;
                    }
                    
                    const colorT = (i / 64 + this.time * 0.1) % 1;
                    bar.material.color.copy(this.getColor(colorT));
                });
                break;

            case 'circular':
                this.audioBandElements.forEach((bar, i) => {
                    const freqIndex = Math.floor((i / this.audioBandElements.length) * frequencies.length * 0.5);
                    const freqValue = frequencies[freqIndex] || 0;
                    
                    const length = 1 + freqValue * 5 * intensity * sensitivity;
                    bar.scale.y = length;
                    
                    // Push outward based on frequency
                    const pushRadius = bar.userData.radius + freqValue * 2 * sensitivity;
                    bar.position.x = Math.cos(bar.userData.angle) * pushRadius;
                    bar.position.y = Math.sin(bar.userData.angle) * pushRadius;
                    
                    const colorT = (i / this.audioBandElements.length + this.time * 0.15) % 1;
                    bar.material.color.copy(this.getColor(colorT));
                });
                break;
        }
    }

    // =====================================================
    // UPDATE & SETTINGS
    // =====================================================

    /**
     * Update visualization with audio data
     */
    update(audioData) {
        this.audioData = audioData;
        const delta = this.clock.getDelta();
        this.time += delta;

        // Update all components
        this.updateCenterElement(audioData, delta);
        this.updateSurroundElements(audioData, delta);
        this.updateAudioBand(audioData, delta);

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        const needsRecreate = {
            center: settings.centerShape !== undefined || settings.centerColor !== undefined || settings.centerSize !== undefined,
            surround: settings.surroundType !== undefined || settings.surroundDensity !== undefined,
            band: settings.bandStyle !== undefined
        };

        Object.assign(this.settings, settings);

        if (needsRecreate.center) this.createCenterElement();
        if (needsRecreate.surround) this.createSurroundElements();
        if (needsRecreate.band) this.createAudioBand();
    }

    /**
     * Render idle state
     */
    renderIdle() {
        const delta = this.clock.getDelta();
        this.time += delta;

        const idleData = {
            amplitude: 0.05 + Math.sin(this.time) * 0.02,
            bass: 0.03 + Math.sin(this.time * 0.5) * 0.02,
            mid: 0.03 + Math.sin(this.time * 0.7) * 0.02,
            treble: 0.02 + Math.sin(this.time * 0.9) * 0.01,
            peak: 0,
            frequencies: new Array(128).fill(0).map((_, i) => 
                0.02 + Math.sin(this.time + i * 0.1) * 0.02
            ),
            waveform: new Array(128).fill(0).map((_, i) => 
                Math.sin(this.time * 2 + i * 0.1) * 0.1
            )
        };

        this.update(idleData);
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear center element
        if (this.centerElement) {
            this.scene.remove(this.centerElement);
            if (this.centerElement.geometry) this.centerElement.geometry.dispose();
            if (this.centerElement.material) this.centerElement.material.dispose();
        }

        // Clear surround elements
        this.surroundElements.forEach(el => {
            this.scene.remove(el);
            if (el.geometry) el.geometry.dispose();
            if (el.material) el.material.dispose();
        });

        // Clear audio band
        this.audioBandElements.forEach(el => {
            this.scene.remove(el);
            if (el.geometry) el.geometry.dispose();
            if (el.material) el.material.dispose();
        });

        window.removeEventListener('resize', this.onResize.bind(this));

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
