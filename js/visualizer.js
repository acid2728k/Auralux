/**
 * Visualizer Module — Core geometry only (background handled by BackgroundSystem)
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BackgroundSystem } from './background-system.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.clock = new THREE.Clock();
        
        // Groups
        this.centerGroup = null;
        this.ringsGroup = null;
        this.surroundGroup = null;
        
        // Settings
        this.settings = {
            geometry: 'icosahedron',
            detail: 3,
            ringsStyle: 'orbital',
            ringsCount: 4,
            surroundType: 'floatingPolyhedra',
            surroundCount: 20,
            bloom: 1.0,
            fog: 1.0
        };
        
        this.baseScale = 4;
        this.colors = {
            primary: new THREE.Color(0xa855f7),
            secondary: new THREE.Color(0xff6a00),
            tertiary: new THREE.Color(0x06b6d4),
            white: new THREE.Color(0xffffff)
        };
        
        this.time = 0;
        this.smoothedAudio = { amplitude: 0, bass: 0, mid: 0, treble: 0 };
        
        // Background system (external)
        this.backgroundSystem = null;
        
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.updateFog();

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 2000);
        this.camera.position.z = 30;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.autoClear = false;
        this.container.appendChild(this.renderer.domElement);

        this.setupPostProcessing();

        // Initialize background system
        this.backgroundSystem = new BackgroundSystem(this.scene, this.camera);

        this.centerGroup = new THREE.Group();
        this.ringsGroup = new THREE.Group();
        this.surroundGroup = new THREE.Group();
        
        this.scene.add(this.centerGroup);
        this.scene.add(this.ringsGroup);
        this.scene.add(this.surroundGroup);

        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();

        window.addEventListener('resize', () => this.onResize());
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.settings.bloom, 0.5, 0.1
        );
        this.composer.addPass(this.bloomPass);
    }

    updateFog() {
        const density = 0.006 * this.settings.fog;
        this.scene.fog = new THREE.FogExp2(0x000005, density);
    }

    // =====================================================
    // GEOMETRY
    // =====================================================

    createGeometry(type, detail) {
        const s = this.baseScale;
        switch (type) {
            case 'tetrahedron': return new THREE.TetrahedronGeometry(s * 1.2, detail);
            case 'hexahedron': return new THREE.BoxGeometry(s * 1.4, s * 1.4, s * 1.4, detail * 2, detail * 2, detail * 2);
            case 'octahedron': return new THREE.OctahedronGeometry(s, detail);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(s, detail);
            case 'icosahedron': return new THREE.IcosahedronGeometry(s, detail);
            case 'stellatedOcta': return new THREE.OctahedronGeometry(s * 1.2, detail + 1);
            case 'torusKnot': return new THREE.TorusKnotGeometry(s * 0.7, s * 0.25, 100 + detail * 30, 16, 2, 3);
            case 'kleinBottle': return this.createKleinBottle(s, detail);
            case 'mobiusStrip': return this.createMobiusStrip(s, detail);
            case 'sierpinski': return this.createSierpinskiTetrahedron(s, Math.min(detail, 4));
            case 'geodesic': return new THREE.IcosahedronGeometry(s, detail + 3);
            default: return new THREE.IcosahedronGeometry(s, detail);
        }
    }

    createKleinBottle(size, detail) {
        return new THREE.ParametricGeometry((u, v, target) => {
            u *= Math.PI * 2; v *= Math.PI * 2;
            const s = size * 0.25;
            let x, y, z;
            if (u < Math.PI) {
                x = 3 * Math.cos(u) * (1 + Math.sin(u)) + 2 * (1 - Math.cos(u) / 2) * Math.cos(u) * Math.cos(v);
                z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
            } else {
                x = 3 * Math.cos(u) * (1 + Math.sin(u)) + 2 * (1 - Math.cos(u) / 2) * Math.cos(v + Math.PI);
                z = -8 * Math.sin(u);
            }
            y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);
            target.set(x * s * 0.3, y * s * 0.3, z * s * 0.3);
        }, 50 + detail * 15, 15 + detail * 3);
    }

    createMobiusStrip(size, detail) {
        return new THREE.ParametricGeometry((u, v, target) => {
            u = u * Math.PI * 2; v = (v - 0.5) * 2;
            const s = size * 0.8;
            target.set(
                (1 + v / 2 * Math.cos(u / 2)) * Math.cos(u) * s,
                (1 + v / 2 * Math.cos(u / 2)) * Math.sin(u) * s,
                v / 2 * Math.sin(u / 2) * s
            );
        }, 50 + detail * 15, 8 + detail * 2);
    }

    createSierpinskiTetrahedron(size, depth) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [], indices = [];
        const addTetra = (v0, v1, v2, v3, d) => {
            if (d === 0) {
                const idx = vertices.length / 3;
                vertices.push(...v0, ...v1, ...v2, ...v3);
                indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3, idx, idx + 3, idx + 1, idx + 1, idx + 3, idx + 2);
                return;
            }
            const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
            const m01 = mid(v0, v1), m02 = mid(v0, v2), m03 = mid(v0, v3);
            const m12 = mid(v1, v2), m13 = mid(v1, v3), m23 = mid(v2, v3);
            addTetra(v0, m01, m02, m03, d - 1);
            addTetra(m01, v1, m12, m13, d - 1);
            addTetra(m02, m12, v2, m23, d - 1);
            addTetra(m03, m13, m23, v3, d - 1);
        };
        const s = size, h = s * Math.sqrt(2 / 3);
        addTetra([0, h, 0], [-s, -h / 3, s * 0.577], [s, -h / 3, s * 0.577], [0, -h / 3, -s * 1.155], depth);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }

    createCenterGeometry() {
        this.clearGroup(this.centerGroup);
        const geometry = this.createGeometry(this.settings.geometry, this.settings.detail);

        const solidMat = new THREE.MeshPhongMaterial({
            color: 0x222233, emissive: 0x0a0a12,
            specular: 0x666688, shininess: 60,
            transparent: true, opacity: 0.65, side: THREE.DoubleSide
        });
        this.centerSolid = new THREE.Mesh(geometry, solidMat);
        this.centerGroup.add(this.centerSolid);

        const wireMat = new THREE.MeshBasicMaterial({
            color: this.colors.primary, wireframe: true, transparent: true, opacity: 0.9
        });
        this.centerWire = new THREE.Mesh(geometry.clone(), wireMat);
        this.centerWire.scale.setScalar(1.01);
        this.centerGroup.add(this.centerWire);

        const glowMat = new THREE.MeshBasicMaterial({
            color: this.colors.secondary, wireframe: true, transparent: true, opacity: 0.25
        });
        this.centerGlow = new THREE.Mesh(geometry.clone(), glowMat);
        this.centerGlow.scale.setScalar(1.1);
        this.centerGroup.add(this.centerGlow);
    }

    // =====================================================
    // RINGS
    // =====================================================

    createRings() {
        this.clearGroup(this.ringsGroup);
        const { ringsStyle, ringsCount } = this.settings;
        if (ringsStyle === 'none') return;

        for (let i = 0; i < ringsCount; i++) {
            const radius = this.baseScale * (1.6 + i * 0.4);
            let geometry, rotation = { x: 0, y: 0, z: 0 };

            switch (ringsStyle) {
                case 'orbital':
                    geometry = new THREE.TorusGeometry(radius, 0.02 + i * 0.005, 16, 100);
                    rotation = { x: Math.PI / 2 + (i * Math.PI / ringsCount / 2), y: i * 0.3, z: 0 };
                    break;
                case 'saturn':
                    geometry = new THREE.RingGeometry(radius, radius + 0.15, 64);
                    rotation = { x: Math.PI / 2, y: 0, z: 0 };
                    break;
                case 'gyroscope':
                    geometry = new THREE.TorusGeometry(radius, 0.03, 8, 64);
                    rotation = { x: (i * Math.PI) / ringsCount, y: 0, z: (i * Math.PI) / (ringsCount * 2) };
                    break;
                case 'atomic':
                    geometry = new THREE.TorusGeometry(radius, 0.015, 8, 80);
                    rotation = { x: (i * Math.PI) / ringsCount, y: (i * Math.PI * 0.5) / ringsCount, z: 0 };
                    break;
                case 'spiral':
                    geometry = new THREE.TorusGeometry(this.baseScale * (1.3 + (i / ringsCount) * 1.5), 0.025, 8, 64);
                    break;
                case 'cage':
                    geometry = i % 2 === 0 
                        ? new THREE.IcosahedronGeometry(this.baseScale * (1.4 + i * 0.3), 0)
                        : new THREE.DodecahedronGeometry(this.baseScale * (1.4 + i * 0.3), 0);
                    break;
            }

            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / ringsCount),
                wireframe: ringsStyle === 'cage',
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6 - i * 0.08
            });

            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.set(rotation.x, rotation.y, rotation.z);
            if (ringsStyle === 'spiral') ring.position.y = ((i / ringsCount) - 0.5) * this.baseScale * 2;
            ring.userData = { type: ringsStyle, index: i, speed: 0.3 + i * 0.1 };
            this.ringsGroup.add(ring);
        }
    }

    // =====================================================
    // SURROUND
    // =====================================================

    createSurroundElements() {
        this.clearGroup(this.surroundGroup);
        const { surroundType, surroundCount } = this.settings;
        if (surroundType === 'none') return;

        for (let i = 0; i < surroundCount; i++) {
            let geometry, material;
            const angle = (i / surroundCount) * Math.PI * 2;
            const radius = this.baseScale * (2 + Math.random() * 2);
            const y = (Math.random() - 0.5) * this.baseScale * 3;

            switch (surroundType) {
                case 'floatingPolyhedra':
                    const geoms = [THREE.TetrahedronGeometry, THREE.OctahedronGeometry, THREE.IcosahedronGeometry];
                    geometry = new geoms[i % 3](0.3, 0);
                    material = new THREE.MeshBasicMaterial({ color: this.getGradientColor(i / surroundCount), wireframe: true, transparent: true, opacity: 0.7 });
                    break;
                case 'particles':
                    geometry = new THREE.SphereGeometry(0.1, 6, 6);
                    material = new THREE.MeshBasicMaterial({ color: this.getGradientColor(Math.random()) });
                    break;
                case 'asteroids':
                    geometry = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3, 0);
                    material = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true });
                    break;
                case 'crystals':
                    geometry = new THREE.ConeGeometry(0.1, 0.4 + Math.random() * 0.3, 6);
                    material = new THREE.MeshPhongMaterial({ color: this.getGradientColor(i / surroundCount), emissive: this.getGradientColor(i / surroundCount), emissiveIntensity: 0.3, transparent: true, opacity: 0.8 });
                    break;
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            mesh.userData = { type: surroundType, angle, radius, baseY: y, rotSpeed: 0.5 + Math.random() };
            if (material.transparent) material.userData = { baseOpacity: material.opacity };
            this.surroundGroup.add(mesh);
        }
    }

    // =====================================================
    // HELPERS
    // =====================================================

    clearGroup(group) {
        while (group.children.length) {
            const child = group.children[0];
            group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }
    }

    getGradientColor(t) {
        if (t < 0.5) return this.colors.primary.clone().lerp(this.colors.secondary, t * 2);
        return this.colors.secondary.clone().lerp(this.colors.tertiary, (t - 0.5) * 2);
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }

    // =====================================================
    // UPDATE
    // =====================================================

    update(audioData) {
        const delta = this.clock.getDelta();
        this.time += delta;

        // Smooth audio
        const s = 0.12;
        this.smoothedAudio.amplitude += (audioData.amplitude - this.smoothedAudio.amplitude) * s;
        this.smoothedAudio.bass += (audioData.bass - this.smoothedAudio.bass) * s;
        this.smoothedAudio.mid += (audioData.mid - this.smoothedAudio.mid) * s;
        this.smoothedAudio.treble += (audioData.treble - this.smoothedAudio.treble) * s;

        const { amplitude, bass, mid, treble } = this.smoothedAudio;

        // Update center geometry
        this.updateCenter(amplitude, bass, mid, delta);
        this.updateRings(amplitude, bass, mid, treble, delta);
        this.updateSurround(amplitude, bass, mid, delta);
        this.updateCamera();

        // Update background system
        if (this.backgroundSystem) {
            this.backgroundSystem.update(delta, { amplitude, bass, mid, treble });
        }

        // Render
        this.renderer.clear();
        
        // Render background quad first
        if (this.backgroundSystem) {
            this.backgroundSystem.renderBackground(this.renderer);
        }
        
        // Render main scene with bloom
        this.bloomPass.strength = (0.5 + amplitude * 0.8) * this.settings.bloom;
        this.composer.render();
    }

    updateCenter(amplitude, bass, mid, delta) {
        if (!this.centerSolid) return;
        const scale = 1 + bass * 0.5;
        this.centerGroup.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        this.centerGroup.rotation.x += delta * (0.15 + mid * 0.4);
        this.centerGroup.rotation.y += delta * (0.25 + mid * 0.5);

        const hsl = {};
        this.colors.primary.getHSL(hsl);
        this.centerWire.material.color.setHSL(hsl.h, hsl.s, 0.4 + amplitude * 0.5);
    }

    updateRings(amplitude, bass, mid, treble, delta) {
        const count = this.ringsGroup.children.length;
        
        this.ringsGroup.children.forEach((ring, i) => {
            const d = ring.userData;
            const style = d.type;
            const t = i / Math.max(count, 1);
            
            // Map each ring to a different frequency band
            const bandValue = i % 3 === 0 ? bass : (i % 3 === 1 ? mid : treble);
            
            // Rotation — speed reacts to amplitude, direction alternates
            const dir = i % 2 === 0 ? 1 : -1;
            ring.rotation.z += delta * (d.speed || 0.3) * (1 + amplitude * 2) * dir;
            ring.rotation.x += delta * 0.05 * (1 + mid) * dir;
            
            // Scale pulse — each ring pulses to its band
            const pulseScale = 1 + bandValue * 0.3;
            ring.scale.setScalar(ring.scale.x + (pulseScale - ring.scale.x) * 0.15);
            
            // Opacity pulse
            const baseOpacity = 0.6 - i * 0.08;
            ring.material.opacity = baseOpacity + amplitude * 0.3;
            
            // Style-specific audio reactions
            switch (style) {
                case 'orbital':
                case 'atomic':
                    // Tilt wobble on bass
                    ring.rotation.x += Math.sin(this.time * 2 + i) * bass * 0.05;
                    break;
                case 'gyroscope':
                    // Counter-rotate on treble
                    ring.rotation.y += delta * treble * 2 * dir;
                    break;
                case 'spiral':
                    // Vertical bounce on bass
                    const baseY = ((i / count) - 0.5) * this.baseScale * 2;
                    ring.position.y = baseY + Math.sin(this.time * 3 + i) * bass * 2;
                    break;
                case 'cage':
                    // Expand/contract on amplitude
                    ring.scale.setScalar(1 + amplitude * 0.5 + Math.sin(this.time + i * 0.5) * 0.1);
                    break;
                case 'saturn':
                    // Gentle tilt sway on mid
                    ring.rotation.x = Math.PI / 2 + Math.sin(this.time + i) * mid * 0.2;
                    break;
            }
            
            // Color shift — hue shifts slightly with audio
            const hsl = {};
            ring.material.color.getHSL(hsl);
            ring.material.color.setHSL(
                (hsl.h + amplitude * 0.02 + delta * 0.01) % 1,
                hsl.s,
                Math.min(1, hsl.l + bandValue * 0.15)
            );
        });
    }

    updateSurround(amplitude, bass, mid, delta) {
        this.surroundGroup.children.forEach((child, i) => {
            const d = child.userData;
            
            // Rotation — speed reacts to audio
            child.rotation.x += delta * (d.rotSpeed || 0.5) * (1 + amplitude * 1.5);
            child.rotation.y += delta * (d.rotSpeed || 0.5) * (0.7 + mid);
            
            // Floating Y with bass bounce
            child.position.y = d.baseY + Math.sin(this.time + d.angle) * 0.5 + bass * 0.8;
            
            // Scale pulse
            const pulseScale = 1 + amplitude * 0.4;
            child.scale.setScalar(child.scale.x + (pulseScale - child.scale.x) * 0.1);
            
            // Orbit radius breathe
            const breatheRadius = d.radius * (1 + Math.sin(this.time * 0.5) * amplitude * 0.3);
            child.position.x = Math.cos(d.angle + this.time * 0.1) * breatheRadius;
            child.position.z = Math.sin(d.angle + this.time * 0.1) * breatheRadius;
            
            // Opacity pulse for transparent materials
            if (child.material.transparent) {
                child.material.opacity = Math.min(1, (child.material.userData?.baseOpacity || 0.7) + amplitude * 0.3);
            }
        });
    }

    updateCamera() {
        this.camera.position.x = Math.sin(this.time * 0.05) * 5;
        this.camera.position.y = Math.cos(this.time * 0.07) * 3;
        this.camera.lookAt(0, 0, 0);
    }

    // =====================================================
    // PUBLIC API — Core geometry
    // =====================================================

    setGeometry(type) { this.settings.geometry = type; this.createCenterGeometry(); }
    setDetail(level) { this.settings.detail = level; this.createCenterGeometry(); }
    setRingsStyle(style) { this.settings.ringsStyle = style; this.createRings(); }
    setRingsCount(count) { this.settings.ringsCount = count; this.createRings(); }
    setSurroundType(type) { this.settings.surroundType = type; this.createSurroundElements(); }
    setSurroundCount(count) { this.settings.surroundCount = count; this.createSurroundElements(); }
    setBloom(val) { this.settings.bloom = val; }
    setFog(val) { this.settings.fog = val; this.updateFog(); }

    // =====================================================
    // PUBLIC API — Background system passthrough
    // =====================================================

    setBgPreset(val) { this.backgroundSystem?.setPreset(val); }
    setBgBrightness(val) { this.backgroundSystem?.setBrightness(val); }
    setBgComplexity(val) { this.backgroundSystem?.setComplexity(val); }
    setBgDepth(val) { this.backgroundSystem?.setDepth(val); }
    setBgDynamics(val) { this.backgroundSystem?.setDynamics(val); }
    setBgTwinkle(val) { this.backgroundSystem?.setTwinkle(val); }
    setBgParallax(val) { this.backgroundSystem?.setParallax(val); }
    setBgAudioSync(val) { this.backgroundSystem?.setAudioSync(val); }
    setAmbientIntensity(val) { this.backgroundSystem?.setAmbientIntensity(val); }
    setBacklightIntensity(val) { this.backgroundSystem?.setBacklightIntensity(val); }
    setBacklightColor(val) { this.backgroundSystem?.setBacklightColor(val); }
    setLightReactsToAudio(val) { this.backgroundSystem?.setLightReactsToAudio(val); }

    // Global
    setGlobalLight(val) {
        this.backgroundSystem?.setGlobalLight(val);
        this.renderer.toneMappingExposure = 1.5 * val;
    }
    setTemperature(val) { this.backgroundSystem?.setTemperature(val); }
    setContrast(val) { this.backgroundSystem?.setContrast(val); }

    // =====================================================
    // RANDOMIZE & IDLE
    // =====================================================

    randomize() {
        const geoms = ['icosahedron', 'octahedron', 'dodecahedron', 'torusKnot', 'kleinBottle', 'geodesic'];
        const rings = ['orbital', 'saturn', 'gyroscope', 'atomic', 'spiral'];
        const surrounds = ['floatingPolyhedra', 'particles', 'asteroids', 'crystals'];
        const presets = ['void', 'nebula', 'dust', 'drift', 'prism'];

        const r = {
            geometry: geoms[Math.floor(Math.random() * geoms.length)],
            detail: Math.floor(Math.random() * 4) + 2,
            rings: rings[Math.floor(Math.random() * rings.length)],
            surround: surrounds[Math.floor(Math.random() * surrounds.length)],
            bgPreset: presets[Math.floor(Math.random() * presets.length)]
        };

        // Random colors for center
        const h1 = Math.random(), h2 = (h1 + 0.3 + Math.random() * 0.3) % 1, h3 = (h2 + 0.2) % 1;
        this.colors.primary.setHSL(h1, 0.8, 0.6);
        this.colors.secondary.setHSL(h2, 0.9, 0.55);
        this.colors.tertiary.setHSL(h3, 0.7, 0.5);

        Object.assign(this.settings, {
            geometry: r.geometry,
            detail: r.detail,
            ringsStyle: r.rings,
            surroundType: r.surround
        });

        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();
        
        // Randomize background
        if (this.backgroundSystem) {
            this.backgroundSystem.setPreset(r.bgPreset);
        }

        return r;
    }

    renderIdle() {
        const delta = this.clock.getDelta();
        this.time += delta;
        this.update({
            amplitude: 0.05 + Math.sin(this.time * 0.5) * 0.03,
            bass: 0.04 + Math.sin(this.time * 0.3) * 0.02,
            mid: 0.03 + Math.sin(this.time * 0.4) * 0.02,
            treble: 0.02 + Math.sin(this.time * 0.6) * 0.01,
            frequencies: new Array(64).fill(0).map((_, i) => 0.03 + Math.sin(this.time + i * 0.05) * 0.02)
        });
    }

    destroy() {
        window.removeEventListener('resize', () => this.onResize());
        [this.centerGroup, this.ringsGroup, this.surroundGroup].forEach(g => this.clearGroup(g));
        if (this.backgroundSystem) this.backgroundSystem.dispose();
        if (this.renderer) { this.renderer.dispose(); this.container.removeChild(this.renderer.domElement); }
    }
}
