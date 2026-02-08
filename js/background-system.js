/**
 * BackgroundSystem — Deep atmospheric 3D background
 * Three layers: FAR (tiny sparse), MID (dust/sparkles), NEAR (large pixels)
 */

import * as THREE from 'three';

// Presets define color palettes, densities, speeds
const PRESETS = {
    void: {
        name: 'Void',
        colors: [0xffffff, 0x8888ff, 0x4444aa],
        fogColor: 0x000005,
        farDensity: 0.3, midDensity: 1.0, nearDensity: 0.4,
        baseSpeed: 0.3, twinkleBase: 0.5
    },
    nebula: {
        name: 'Nebula',
        colors: [0xa855f7, 0xff6a00, 0x06b6d4],
        fogColor: 0x050008,
        farDensity: 0.5, midDensity: 1.2, nearDensity: 0.5,
        baseSpeed: 0.4, twinkleBase: 0.7
    },
    dust: {
        name: 'Dust',
        colors: [0xffffff, 0xcccccc, 0x888888],
        fogColor: 0x000000,
        farDensity: 0.4, midDensity: 0.8, nearDensity: 0.3,
        baseSpeed: 0.2, twinkleBase: 0.3
    },
    drift: {
        name: 'Drift',
        colors: [0x06b6d4, 0x22d3ee, 0xffffff],
        fogColor: 0x000308,
        farDensity: 0.3, midDensity: 1.0, nearDensity: 0.6,
        baseSpeed: 0.5, twinkleBase: 0.4
    },
    prism: {
        name: 'Prism',
        colors: [0xff6a00, 0xa855f7, 0x06b6d4, 0xffffff],
        fogColor: 0x020005,
        farDensity: 0.4, midDensity: 1.1, nearDensity: 0.5,
        baseSpeed: 0.35, twinkleBase: 0.6
    }
};

export class BackgroundSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Config
        this.config = {
            preset: 'nebula',
            brightness: 1.0,
            complexity: 5,
            depth: 200,
            dynamics: 1.0,
            twinkle: 0.5,
            parallax: 0.5,
            audioSync: true,
            ambientIntensity: 0.3,
            backlightIntensity: 2.0,
            backlightColor: '#a855f7',
            lightReactsToAudio: true,
            globalLight: 1.0,
            temperature: 0.0,
            contrast: 1.0
        };
        
        // Groups
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // Layers
        this.layers = { far: null, mid: null, near: null };
        
        // Background quad
        this.bgQuad = null;
        this.bgScene = null;
        this.bgCamera = null;
        
        // Lights
        this.ambientLight = null;
        this.backLight = null;
        this.frontLight = null;
        this.accentLights = [];
        
        // Audio smoothing
        this.smoothedAudio = { energy: 0, bass: 0 };
        this.lastFlashTime = 0;
        
        // Time
        this.time = 0;
        
        // Reusable vectors (no GC)
        this._tempVec = new THREE.Vector3();
        
        this.init();
    }

    init() {
        this.createBackgroundQuad();
        this.createLights();
        this.createLayers();
    }

    // =========================================================
    // BACKGROUND QUAD (gradient + noise + vignette)
    // =========================================================

    createBackgroundQuad() {
        if (this.bgQuad) {
            this.bgScene.remove(this.bgQuad);
            this.bgQuad.geometry.dispose();
            this.bgQuad.material.dispose();
        }

        this.bgScene = new THREE.Scene();
        this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const preset = PRESETS[this.config.preset];
        
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform float uBrightness;
            uniform float uAmbient;
            uniform float uBacklightIntensity;
            uniform vec3 uBacklightColor;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform float uGlobalLight;
            uniform float uTemperature;
            uniform float uContrast;
            varying vec2 vUv;
            
            // Simple noise
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            vec3 applyTemperature(vec3 c, float temp) {
                // negative = cool (blue), positive = warm (orange)
                c.r += temp * 0.08;
                c.b -= temp * 0.08;
                return c;
            }

            vec3 applyContrast(vec3 c, float contrast) {
                return (c - 0.5) * contrast + 0.5;
            }
            
            void main() {
                vec2 center = vUv - 0.5;
                float dist = length(center);
                
                // Base background — lifted by global light
                float baseBrightness = uGlobalLight * 0.04;
                vec3 color = vec3(baseBrightness);
                
                // Gradient from preset colors
                vec3 gradColor = mix(uColor1, uColor2, dist * 1.5);
                color += gradColor * uGlobalLight * 0.5;
                
                // Ambient fill — raises the entire background
                color += uAmbient * uGlobalLight * 0.12;
                
                // Backlight glow — radial bloom from center
                float glowInner = 1.0 - smoothstep(0.0, 0.4, dist);
                float glowOuter = 1.0 - smoothstep(0.0, 0.8, dist);
                color += uBacklightColor * uBacklightIntensity * glowInner * 0.12;
                color += uBacklightColor * uBacklightIntensity * glowOuter * 0.04;
                
                // Subtle animated noise
                float n = noise(vUv * 3.0 + uTime * 0.02) * 0.06;
                float n2 = noise(vUv * 8.0 - uTime * 0.01) * 0.03;
                color += (n + n2) * uBrightness * uGlobalLight * 0.5;
                
                // Vignette
                float vignette = 1.0 - smoothstep(0.3, 0.95, dist);
                color *= vignette * 0.6 + 0.4;
                
                // Master brightness
                color *= uBrightness;
                
                // Temperature & contrast
                color = applyTemperature(color, uTemperature);
                color = applyContrast(color, uContrast);
                
                gl_FragColor = vec4(max(color, 0.0), 1.0);
            }
        `;

        const bgColor1 = new THREE.Color(preset.fogColor);
        const bgColor2 = new THREE.Color(0x000000);

        this.bgMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBrightness: { value: this.config.brightness },
                uAmbient: { value: this.config.ambientIntensity },
                uBacklightIntensity: { value: this.config.backlightIntensity },
                uBacklightColor: { value: new THREE.Color(this.config.backlightColor) },
                uColor1: { value: bgColor1 },
                uColor2: { value: bgColor2 },
                uGlobalLight: { value: 1.0 },
                uTemperature: { value: 0.0 },
                uContrast: { value: 1.0 }
            },
            vertexShader,
            fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        this.bgQuad = new THREE.Mesh(geometry, this.bgMaterial);
        this.bgScene.add(this.bgQuad);
    }

    // =========================================================
    // LIGHTS
    // =========================================================

    createLights() {
        // Remove existing
        if (this.ambientLight) this.scene.remove(this.ambientLight);
        if (this.backLight) this.scene.remove(this.backLight);
        if (this.frontLight) this.scene.remove(this.frontLight);
        this.accentLights.forEach(l => this.scene.remove(l));
        this.accentLights = [];

        // Ambient — white so intensity slider has clear visual effect
        this.ambientLight = new THREE.AmbientLight(0xffffff, this.config.ambientIntensity);
        this.scene.add(this.ambientLight);

        // Front key light — always illuminates center geometry
        this.frontLight = new THREE.PointLight(0xffffff, 2, 100);
        this.frontLight.position.set(0, 5, 25);
        this.scene.add(this.frontLight);

        // Backlight — large PointLight from behind with user color
        const blColor = new THREE.Color(this.config.backlightColor);
        this.backLight = new THREE.PointLight(blColor, this.config.backlightIntensity, 150);
        this.backLight.position.set(0, 10, -25);
        this.scene.add(this.backLight);

        // Side accent lights
        const accent1 = new THREE.PointLight(0xa855f7, 1.5, 80);
        accent1.position.set(-25, 15, 10);
        this.scene.add(accent1);
        this.accentLights.push(accent1);

        const accent2 = new THREE.PointLight(0x06b6d4, 1.0, 80);
        accent2.position.set(20, -10, -15);
        this.scene.add(accent2);
        this.accentLights.push(accent2);
    }

    updateLights() {
        if (this.ambientLight) {
            this.ambientLight.intensity = this.config.ambientIntensity;
        }
        if (this.backLight) {
            this.backLight.intensity = this.config.backlightIntensity;
            this.backLight.color.set(this.config.backlightColor);
        }
        
        // Sync to background quad shader
        if (this.bgMaterial) {
            this.bgMaterial.uniforms.uAmbient.value = this.config.ambientIntensity;
            this.bgMaterial.uniforms.uBacklightIntensity.value = this.config.backlightIntensity;
            this.bgMaterial.uniforms.uBacklightColor.value.set(this.config.backlightColor);
        }
        
        // Sync to particle layer shaders
        const blColor = new THREE.Color(this.config.backlightColor);
        Object.values(this.layers).forEach(layer => {
            if (layer && layer.material.uniforms) {
                layer.material.uniforms.uAmbient.value = this.config.ambientIntensity;
                layer.material.uniforms.uBacklightColor.value.copy(blColor);
                layer.material.uniforms.uBacklightIntensity.value = this.config.backlightIntensity;
            }
        });
    }

    // =========================================================
    // PARTICLE LAYERS
    // =========================================================

    createLayers() {
        this.disposeLayers();
        
        const preset = PRESETS[this.config.preset];
        const { complexity, depth } = this.config;
        const baseCount = complexity * 100;

        // FAR layer: tiny sparse dots
        this.layers.far = this.createParticleLayer({
            count: Math.floor(baseCount * preset.farDensity),
            sizeMin: 0.3, sizeMax: 0.8,
            zMin: -depth, zMax: -depth * 0.6,
            xRange: depth * 1.5, yRange: depth * 0.8,
            colors: preset.colors,
            speedMult: 0.2,
            opacity: 0.4
        });

        // MID layer: main dust/sparkles
        this.layers.mid = this.createParticleLayer({
            count: Math.floor(baseCount * preset.midDensity * 2),
            sizeMin: 0.5, sizeMax: 1.5,
            zMin: -depth * 0.6, zMax: -depth * 0.15,
            xRange: depth * 1.2, yRange: depth * 0.6,
            colors: preset.colors,
            speedMult: 0.5,
            opacity: 0.6
        });

        // NEAR layer: large sparse pixels
        this.layers.near = this.createParticleLayer({
            count: Math.floor(baseCount * preset.nearDensity * 0.3),
            sizeMin: 2.0, sizeMax: 4.0,
            zMin: -depth * 0.15, zMax: -10,
            xRange: depth * 0.8, yRange: depth * 0.4,
            colors: preset.colors,
            speedMult: 1.0,
            opacity: 0.3
        });
    }

    createParticleLayer(opts) {
        const { count, sizeMin, sizeMax, zMin, zMax, xRange, yRange, colors, speedMult, opacity } = opts;

        // Attributes
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const phases = new Float32Array(count);
        const sizes = new Float32Array(count);
        const colorIndices = new Float32Array(count);
        const basePositions = new Float32Array(count * 3); // for wrap-around

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Position
            positions[i3] = (Math.random() - 0.5) * xRange;
            positions[i3 + 1] = (Math.random() - 0.5) * yRange;
            positions[i3 + 2] = zMin + Math.random() * (zMax - zMin);
            
            // Store base for wrap
            basePositions[i3] = positions[i3];
            basePositions[i3 + 1] = positions[i3 + 1];
            basePositions[i3 + 2] = positions[i3 + 2];
            
            // Velocity (drift direction)
            velocities[i3] = (Math.random() - 0.5) * 0.5 * speedMult;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.3 * speedMult;
            velocities[i3 + 2] = (0.5 + Math.random() * 0.5) * speedMult;
            
            // Phase for twinkle
            phases[i] = Math.random() * Math.PI * 2;
            
            // Size
            sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
            
            // Color index
            colorIndices[i] = Math.floor(Math.random() * colors.length);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('aColorIndex', new THREE.BufferAttribute(colorIndices, 1));

        // Create color array for shader
        const colorArray = colors.map(c => new THREE.Color(c));

        const vertexShader = `
            attribute vec3 aVelocity;
            attribute float aPhase;
            attribute float aSize;
            attribute float aColorIndex;
            
            uniform float uTime;
            uniform float uTwinkle;
            uniform float uDynamics;
            uniform float uBrightness;
            uniform float uAmbient;
            uniform float uAudioEnergy;
            
            varying float vAlpha;
            varying float vColorIndex;
            
            void main() {
                vec3 pos = position;
                
                // Twinkle alpha
                float twinkle = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
                vAlpha = mix(0.5, 1.0, twinkle * uTwinkle) * uBrightness;
                vAlpha *= 1.0 + uAudioEnergy * 0.3;
                vAlpha *= 0.5 + uAmbient * 0.8;
                
                vColorIndex = aColorIndex;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = aSize * (300.0 / -mvPosition.z) * (1.0 + uAudioEnergy * 0.2);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform vec3 uColors[4];
            uniform vec3 uBacklightColor;
            uniform float uBacklightIntensity;
            uniform float uOpacity;
            uniform float uGlobalLight;
            uniform float uTemperature;
            uniform float uContrast;
            
            varying float vAlpha;
            varying float vColorIndex;

            vec3 applyTemperature(vec3 c, float temp) {
                c.r += temp * 0.12;
                c.b -= temp * 0.12;
                return c;
            }

            vec3 applyContrast(vec3 c, float contrast) {
                return (c - 0.5) * contrast + 0.5;
            }
            
            void main() {
                // Soft circle
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                if (dist > 0.5) discard;
                
                float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * uOpacity;
                
                int idx = int(vColorIndex);
                vec3 color = uColors[idx];
                
                // Mix in backlight color tint
                color = mix(color, uBacklightColor, uBacklightIntensity * 0.08);
                
                // Global adjustments
                color *= uGlobalLight;
                color = applyTemperature(color, uTemperature);
                color = applyContrast(color, uContrast);
                
                gl_FragColor = vec4(max(color, 0.0), alpha);
            }
        `;

        // Pad colors to 4
        while (colorArray.length < 4) colorArray.push(colorArray[0]);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTwinkle: { value: this.config.twinkle },
                uDynamics: { value: this.config.dynamics },
                uBrightness: { value: this.config.brightness },
                uAmbient: { value: this.config.ambientIntensity },
                uAudioEnergy: { value: 0 },
                uColors: { value: colorArray },
                uBacklightColor: { value: new THREE.Color(this.config.backlightColor) },
                uBacklightIntensity: { value: this.config.backlightIntensity },
                uOpacity: { value: opacity },
                uGlobalLight: { value: 1.0 },
                uTemperature: { value: 0.0 },
                uContrast: { value: 1.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        points.userData = {
            bounds: { xRange, yRange, zMin, zMax },
            basePositions,
            velocities,
            speedMult
        };
        
        this.group.add(points);
        return points;
    }

    disposeLayers() {
        Object.values(this.layers).forEach(layer => {
            if (layer) {
                this.group.remove(layer);
                layer.geometry.dispose();
                layer.material.dispose();
            }
        });
        this.layers = { far: null, mid: null, near: null };
    }

    // =========================================================
    // UPDATE
    // =========================================================

    update(dt, audioMetrics = {}) {
        this.time += dt;
        
        // Smooth audio
        const targetEnergy = audioMetrics.amplitude || 0;
        const targetBass = audioMetrics.bass || 0;
        this.smoothedAudio.energy += (targetEnergy - this.smoothedAudio.energy) * 0.1;
        this.smoothedAudio.bass += (targetBass - this.smoothedAudio.bass) * 0.15;

        const audioEnergy = this.config.audioSync ? this.smoothedAudio.energy : 0;
        const audioBass = this.config.audioSync ? this.smoothedAudio.bass : 0;

        // Update background quad
        if (this.bgMaterial) {
            this.bgMaterial.uniforms.uTime.value = this.time;
            this.bgMaterial.uniforms.uBrightness.value = this.config.brightness * (1 + audioEnergy * 0.2);
        }

        // Update layers
        const preset = PRESETS[this.config.preset];
        const dynamicsSpeed = this.config.dynamics * preset.baseSpeed;

        // Parallax speeds: FAR slowest, NEAR fastest
        const parallaxFar = 1.0 - this.config.parallax * 0.8;
        const parallaxMid = 1.0;
        const parallaxNear = 1.0 + this.config.parallax * 1.5;

        this.updateLayer(this.layers.far, dt, dynamicsSpeed * parallaxFar, audioEnergy);
        this.updateLayer(this.layers.mid, dt, dynamicsSpeed * parallaxMid, audioEnergy);
        this.updateLayer(this.layers.near, dt, dynamicsSpeed * parallaxNear, audioEnergy);

        // Light audio reaction
        if (this.config.lightReactsToAudio) {
            if (this.backLight) {
                this.backLight.intensity = this.config.backlightIntensity * (1 + audioBass * 0.8);
            }
            if (this.frontLight) {
                this.frontLight.intensity = 2 + audioEnergy * 3;
            }
            this.accentLights.forEach((l, i) => {
                l.intensity = 1.0 + audioEnergy * 2;
                l.position.x = Math.sin(this.time * 0.4 + i * Math.PI) * 25;
                l.position.y = Math.cos(this.time * 0.3 + i * 1.5) * 15;
            });
        }

        // Bass flash (max once per 0.3s)
        if (audioBass > 0.6 && this.time - this.lastFlashTime > 0.3) {
            this.lastFlashTime = this.time;
            // Brief brightness boost to mid layer
            if (this.layers.mid) {
                this.layers.mid.material.uniforms.uBrightness.value = this.config.brightness * 1.5;
            }
        } else if (this.layers.mid) {
            // Decay flash
            const current = this.layers.mid.material.uniforms.uBrightness.value;
            this.layers.mid.material.uniforms.uBrightness.value = Math.max(
                this.config.brightness,
                current - dt * 2
            );
        }
    }

    updateLayer(layer, dt, speed, audioEnergy) {
        if (!layer) return;

        const positions = layer.geometry.attributes.position.array;
        const { bounds, velocities, speedMult } = layer.userData;
        const { xRange, yRange, zMin, zMax } = bounds;

        const count = positions.length / 3;
        const dynamicSpeed = speed * (1 + audioEnergy * 0.5);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Apply velocity with wave
            const waveX = Math.sin(this.time * 0.5 + i * 0.1) * 0.1 * this.config.dynamics;
            const waveY = Math.cos(this.time * 0.3 + i * 0.15) * 0.05 * this.config.dynamics;

            positions[i3] += (velocities[i3] + waveX) * dynamicSpeed * dt * 10;
            positions[i3 + 1] += (velocities[i3 + 1] + waveY) * dynamicSpeed * dt * 10;
            positions[i3 + 2] += velocities[i3 + 2] * dynamicSpeed * dt * 10;

            // Wrap around bounds
            if (positions[i3] > xRange / 2) positions[i3] = -xRange / 2;
            if (positions[i3] < -xRange / 2) positions[i3] = xRange / 2;
            if (positions[i3 + 1] > yRange / 2) positions[i3 + 1] = -yRange / 2;
            if (positions[i3 + 1] < -yRange / 2) positions[i3 + 1] = yRange / 2;
            if (positions[i3 + 2] > zMax) positions[i3 + 2] = zMin;
            if (positions[i3 + 2] < zMin) positions[i3 + 2] = zMax;
        }

        layer.geometry.attributes.position.needsUpdate = true;

        // Update uniforms
        layer.material.uniforms.uTime.value = this.time;
        layer.material.uniforms.uTwinkle.value = this.config.twinkle;
        layer.material.uniforms.uDynamics.value = this.config.dynamics;
        layer.material.uniforms.uAudioEnergy.value = audioEnergy;
    }

    // =========================================================
    // RENDER BACKGROUND QUAD
    // =========================================================

    renderBackground(renderer) {
        if (this.bgScene && this.bgCamera) {
            renderer.autoClear = false;
            renderer.render(this.bgScene, this.bgCamera);
            renderer.autoClear = true;
        }
    }

    // =========================================================
    // CONFIG SETTERS
    // =========================================================

    setPreset(preset) {
        if (PRESETS[preset]) {
            this.config.preset = preset;
            this.createBackgroundQuad();
            this.createLayers();
        }
    }

    setBrightness(val) {
        this.config.brightness = val;
        Object.values(this.layers).forEach(layer => {
            if (layer) layer.material.uniforms.uBrightness.value = val;
        });
    }

    setComplexity(val) {
        this.config.complexity = val;
        this.createLayers();
    }

    setDepth(val) {
        this.config.depth = val;
        this.createLayers();
    }

    setDynamics(val) { this.config.dynamics = val; }
    setTwinkle(val) { this.config.twinkle = val; }
    setParallax(val) { this.config.parallax = val; }
    setAudioSync(val) { this.config.audioSync = val; }

    setAmbientIntensity(val) {
        this.config.ambientIntensity = val;
        this.updateLights();
    }

    setBacklightIntensity(val) {
        this.config.backlightIntensity = val;
        this.updateLights();
    }

    setBacklightColor(val) {
        this.config.backlightColor = val;
        this.updateLights();
    }

    setLightReactsToAudio(val) { this.config.lightReactsToAudio = val; }

    setGlobalLight(val) {
        this.config.globalLight = val;
        this.syncGlobalUniforms();
    }

    setTemperature(val) {
        this.config.temperature = val;
        this.syncGlobalUniforms();
    }

    setContrast(val) {
        this.config.contrast = val;
        this.syncGlobalUniforms();
    }

    syncGlobalUniforms() {
        const { globalLight, temperature, contrast } = this.config;

        // Background quad
        if (this.bgMaterial) {
            this.bgMaterial.uniforms.uGlobalLight.value = globalLight;
            this.bgMaterial.uniforms.uTemperature.value = temperature;
            this.bgMaterial.uniforms.uContrast.value = contrast;
        }

        // Particle layers
        Object.values(this.layers).forEach(layer => {
            if (layer && layer.material.uniforms) {
                layer.material.uniforms.uGlobalLight.value = globalLight;
                layer.material.uniforms.uTemperature.value = temperature;
                layer.material.uniforms.uContrast.value = contrast;
            }
        });

        // Three.js lights — scale by globalLight
        if (this.ambientLight) {
            this.ambientLight.intensity = this.config.ambientIntensity * globalLight;
        }
        if (this.frontLight) {
            this.frontLight.intensity = 2 * globalLight;
        }
        if (this.backLight) {
            this.backLight.intensity = this.config.backlightIntensity * globalLight;
        }
        this.accentLights.forEach(l => {
            l.intensity = 1.5 * globalLight;
        });

        // Apply temperature to Three.js accent lights (hue shift)
        if (temperature !== 0) {
            const warmColor = new THREE.Color(1, 0.85, 0.6);  // warm
            const coolColor = new THREE.Color(0.6, 0.8, 1.0);  // cool
            const tintColor = temperature > 0
                ? warmColor.clone().lerp(new THREE.Color(1, 1, 1), 1 - temperature)
                : coolColor.clone().lerp(new THREE.Color(1, 1, 1), 1 + temperature);

            if (this.frontLight) {
                this.frontLight.color.copy(tintColor);
            }
        } else if (this.frontLight) {
            this.frontLight.color.set(0xffffff);
        }
    }

    // =========================================================
    // DISPOSE
    // =========================================================

    dispose() {
        this.disposeLayers();
        
        if (this.bgQuad) {
            this.bgScene.remove(this.bgQuad);
            this.bgQuad.geometry.dispose();
            this.bgQuad.material.dispose();
        }
        
        if (this.ambientLight) this.scene.remove(this.ambientLight);
        if (this.backLight) this.scene.remove(this.backLight);
        if (this.frontLight) this.scene.remove(this.frontLight);
        this.accentLights.forEach(l => this.scene.remove(l));
        
        this.scene.remove(this.group);
    }
}

export { PRESETS };
