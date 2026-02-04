/**
 * Visualizer Module - Extended Controls
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.clock = new THREE.Clock();
        
        // Groups
        this.centerGroup = null;
        this.ringsGroup = null;
        this.surroundGroup = null;
        this.backgroundGroup = null;
        this.particlesGroup = null;
        
        // Settings
        this.settings = {
            geometry: 'icosahedron',
            detail: 3,
            ringsStyle: 'orbital',
            ringsCount: 4,
            surroundType: 'floatingPolyhedra',
            surroundCount: 20,
            backgroundType: 'flyingDebris',
            backgroundDensity: 50,
            backgroundSpeed: 1,
            lightMode: 'dynamic',
            brightness: 1,
            lightComplexity: 3,
            depth: 1,
            bloom: 1,
            fog: 1
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
        this.flyingObjects = [];
        this.lights = [];
        
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
        this.container.appendChild(this.renderer.domElement);

        this.setupPostProcessing();
        this.setupLights();

        this.centerGroup = new THREE.Group();
        this.ringsGroup = new THREE.Group();
        this.surroundGroup = new THREE.Group();
        this.backgroundGroup = new THREE.Group();
        this.particlesGroup = new THREE.Group();
        
        this.scene.add(this.centerGroup);
        this.scene.add(this.ringsGroup);
        this.scene.add(this.surroundGroup);
        this.scene.add(this.backgroundGroup);
        this.scene.add(this.particlesGroup);

        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();
        this.createBackgroundElements();
        this.createDeepParticles();

        window.addEventListener('resize', () => this.onResize());
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.0 * this.settings.bloom, 0.5, 0.1
        );
        this.composer.addPass(this.bloomPass);
    }

    setupLights() {
        // Clear existing lights
        this.lights.forEach(l => this.scene.remove(l));
        this.lights = [];

        const brightness = this.settings.brightness;
        const complexity = this.settings.lightComplexity;

        // Ambient
        const ambient = new THREE.AmbientLight(0x111122, 0.3 * brightness);
        this.scene.add(ambient);
        this.lights.push(ambient);

        // Main light
        this.mainLight = new THREE.PointLight(this.colors.primary, 3 * brightness, 80);
        this.mainLight.position.set(0, 0, 25);
        this.scene.add(this.mainLight);
        this.lights.push(this.mainLight);

        // Additional lights based on complexity
        if (complexity >= 2) {
            this.accentLight = new THREE.PointLight(this.colors.secondary, 2 * brightness, 60);
            this.accentLight.position.set(-20, 15, 10);
            this.scene.add(this.accentLight);
            this.lights.push(this.accentLight);
        }

        if (complexity >= 3) {
            this.backLight = new THREE.PointLight(this.colors.tertiary, 1.5 * brightness, 60);
            this.backLight.position.set(15, -10, -20);
            this.scene.add(this.backLight);
            this.lights.push(this.backLight);
        }

        if (complexity >= 4) {
            this.rimLight = new THREE.PointLight(0xffffff, 0.8 * brightness, 50);
            this.rimLight.position.set(0, 25, -15);
            this.scene.add(this.rimLight);
            this.lights.push(this.rimLight);
        }

        if (complexity >= 5) {
            this.bottomLight = new THREE.PointLight(this.colors.primary, 1 * brightness, 40);
            this.bottomLight.position.set(0, -20, 10);
            this.scene.add(this.bottomLight);
            this.lights.push(this.bottomLight);
        }
    }

    updateFog() {
        const fogDensity = 0.008 * this.settings.fog;
        this.scene.fog = new THREE.FogExp2(0x000005, fogDensity);
    }

    updateBloom() {
        this.bloomPass.strength = this.settings.bloom;
    }

    updateDepth() {
        const d = this.settings.depth;
        this.camera.position.z = 30 / d;
        this.camera.fov = 70 * d;
        this.camera.updateProjectionMatrix();
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
            color: 0x0a0a0a, emissive: 0x111111,
            transparent: true, opacity: 0.5, side: THREE.DoubleSide
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
    // RINGS, SURROUND, BACKGROUND (same as before, abbreviated)
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
            this.surroundGroup.add(mesh);
        }
    }

    createBackgroundElements() {
        this.clearGroup(this.backgroundGroup);
        this.flyingObjects = [];
        const { backgroundType, backgroundDensity } = this.settings;
        if (backgroundType === 'none') return;

        switch (backgroundType) {
            case 'flyingDebris':
                this.createFlyingDebris(backgroundDensity);
                break;
            case 'starfield':
                this.createStarfield(backgroundDensity * 5);
                break;
            case 'meteors':
                this.createMeteors(Math.floor(backgroundDensity / 3));
                break;
            case 'nebula':
                this.createNebula(backgroundDensity * 3);
                break;
            case 'grid':
                this.createGrid();
                break;
        }
    }

    createFlyingDebris(count) {
        const geomTypes = [
            () => new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.5, 0),
            () => new THREE.OctahedronGeometry(0.4 + Math.random() * 0.4, 0),
            () => new THREE.BoxGeometry(0.4, 0.6, 0.3),
            () => new THREE.DodecahedronGeometry(0.3, 0)
        ];

        for (let i = 0; i < count; i++) {
            const geom = geomTypes[Math.floor(Math.random() * geomTypes.length)]();
            const mat = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? 0x333333 : this.getGradientColor(Math.random()).getHex(),
                flatShading: true, transparent: true, opacity: 0.8
            });
            const debris = new THREE.Mesh(geom, mat);
            
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 100;
            const z = -50 - Math.random() * 150;
            debris.position.set(x, y, z);
            debris.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
            
            debris.userData = {
                type: 'debris',
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, 2 + Math.random() * 3),
                rotVel: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
                startZ: z
            };
            
            this.flyingObjects.push(debris);
            this.backgroundGroup.add(debris);
        }
    }

    createStarfield(count) {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = -20 - Math.random() * 200;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.userData.originalPositions = positions.slice();
        const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        const stars = new THREE.Points(geom, mat);
        stars.userData = { type: 'starfield' };
        this.backgroundGroup.add(stars);
    }

    createMeteors(count) {
        for (let i = 0; i < count; i++) {
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 8),
                new THREE.MeshBasicMaterial({ color: this.getGradientColor(Math.random()) })
            );
            const trail = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 3 + Math.random() * 4, 8),
                new THREE.MeshBasicMaterial({ color: this.colors.secondary, transparent: true, opacity: 0.4 })
            );
            trail.rotation.x = Math.PI / 2;
            trail.position.z = 2;

            const meteor = new THREE.Group();
            meteor.add(head);
            meteor.add(trail);
            meteor.position.set((Math.random() - 0.5) * 150, 30 + Math.random() * 50, -100 - Math.random() * 100);
            meteor.rotation.x = -0.5;
            meteor.userData = {
                type: 'meteor',
                velocity: new THREE.Vector3((Math.random() - 0.5) * 2, -3 - Math.random() * 3, 5 + Math.random() * 5),
                startPos: meteor.position.clone()
            };
            this.flyingObjects.push(meteor);
            this.backgroundGroup.add(meteor);
        }
    }

    createNebula(count) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 30 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = -30 - r * 0.5;
            const c = this.getGradientColor(Math.random());
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geom.userData.originalPositions = positions.slice();
        const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        const nebula = new THREE.Points(geom, mat);
        nebula.userData = { type: 'nebula' };
        this.backgroundGroup.add(nebula);
    }

    createGrid() {
        const grid = new THREE.GridHelper(200, 50, 0x333333, 0x222222);
        grid.position.y = -20;
        this.backgroundGroup.add(grid);
    }

    createDeepParticles() {
        this.clearGroup(this.particlesGroup);
        const count = 800;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = -Math.random() * 300;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.userData.originalPositions = positions.slice();
        const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.4 });
        const particles = new THREE.Points(geom, mat);
        particles.userData = { type: 'deepParticles' };
        this.particlesGroup.add(particles);
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

        const s = 0.12;
        this.smoothedAudio.amplitude += (audioData.amplitude - this.smoothedAudio.amplitude) * s;
        this.smoothedAudio.bass += (audioData.bass - this.smoothedAudio.bass) * s;
        this.smoothedAudio.mid += (audioData.mid - this.smoothedAudio.mid) * s;
        this.smoothedAudio.treble += (audioData.treble - this.smoothedAudio.treble) * s;

        const { amplitude, bass, mid, treble } = this.smoothedAudio;

        this.updateCenter(amplitude, bass, mid, delta);
        this.updateRings(amplitude, delta);
        this.updateSurround(amplitude, delta);
        this.updateBackground(delta);
        this.updateLights(amplitude, bass, treble, delta);
        this.updateCamera();

        this.bloomPass.strength = (0.5 + amplitude * 1.0) * this.settings.bloom;
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

    updateRings(amplitude, delta) {
        this.ringsGroup.children.forEach((ring, i) => {
            const d = ring.userData;
            ring.rotation.z += delta * (d.speed || 0.3) * (1 + amplitude) * (i % 2 === 0 ? 1 : -1);
        });
    }

    updateSurround(amplitude, delta) {
        this.surroundGroup.children.forEach(child => {
            const d = child.userData;
            child.rotation.x += delta * (d.rotSpeed || 0.5) * (1 + amplitude);
            child.rotation.y += delta * (d.rotSpeed || 0.5) * 0.7;
            child.position.y = d.baseY + Math.sin(this.time + d.angle) * 0.5;
        });
    }

    updateBackground(delta) {
        const speed = this.settings.backgroundSpeed;
        
        this.flyingObjects.forEach(obj => {
            const d = obj.userData;
            if (d.type === 'debris') {
                obj.position.add(d.velocity.clone().multiplyScalar(delta * 10 * speed));
                obj.rotation.x += d.rotVel.x * speed;
                obj.rotation.y += d.rotVel.y * speed;
                obj.rotation.z += d.rotVel.z * speed;
                if (obj.position.z > 50) {
                    obj.position.z = d.startZ;
                    obj.position.x = (Math.random() - 0.5) * 200;
                    obj.position.y = (Math.random() - 0.5) * 100;
                }
            } else if (d.type === 'meteor') {
                obj.position.add(d.velocity.clone().multiplyScalar(delta * 10 * speed));
                if (obj.position.z > 50 || obj.position.y < -80) {
                    obj.position.copy(d.startPos);
                    obj.position.x = (Math.random() - 0.5) * 150;
                }
            }
        });

        this.backgroundGroup.children.forEach(child => {
            const d = child.userData;
            if ((d.type === 'starfield' || d.type === 'nebula') && child.geometry.userData.originalPositions) {
                const pos = child.geometry.attributes.position.array;
                const orig = child.geometry.userData.originalPositions;
                for (let i = 0; i < pos.length / 3; i++) {
                    pos[i * 3 + 2] = orig[i * 3 + 2] + Math.sin(this.time * 0.3 * speed + i * 0.01) * 2;
                }
                child.geometry.attributes.position.needsUpdate = true;
            }
        });

        this.particlesGroup.children.forEach(child => {
            if (child.userData.type === 'deepParticles') {
                const pos = child.geometry.attributes.position.array;
                const orig = child.geometry.userData.originalPositions;
                for (let i = 0; i < pos.length / 3; i++) {
                    pos[i * 3] = orig[i * 3] + Math.sin(this.time * 0.1 * speed + i * 0.01) * 2;
                    pos[i * 3 + 1] = orig[i * 3 + 1] + Math.cos(this.time * 0.08 * speed + i * 0.01) * 2;
                }
                child.geometry.attributes.position.needsUpdate = true;
                child.rotation.y += delta * 0.005 * speed;
            }
        });
    }

    updateLights(amplitude, bass, treble, delta) {
        const mode = this.settings.lightMode;
        const brightness = this.settings.brightness;

        switch (mode) {
            case 'dynamic':
                if (this.mainLight) this.mainLight.intensity = (2 + amplitude * 3) * brightness;
                if (this.accentLight) {
                    this.accentLight.intensity = (1 + bass * 2) * brightness;
                    this.accentLight.position.x = Math.sin(this.time * 0.3) * 20;
                    this.accentLight.position.y = Math.cos(this.time * 0.2) * 15;
                }
                if (this.backLight) this.backLight.intensity = (1 + treble * 2) * brightness;
                break;
            case 'static':
                if (this.mainLight) this.mainLight.intensity = 3 * brightness;
                if (this.accentLight) this.accentLight.intensity = 2 * brightness;
                if (this.backLight) this.backLight.intensity = 1.5 * brightness;
                break;
            case 'pulse':
                const pulse = Math.sin(this.time * 3) * 0.5 + 0.5;
                if (this.mainLight) this.mainLight.intensity = (1 + pulse * 3 + amplitude * 2) * brightness;
                if (this.accentLight) this.accentLight.intensity = (pulse * 2) * brightness;
                break;
            case 'strobe':
                const strobe = Math.sin(this.time * 15) > 0.7 ? 1 : 0.2;
                if (this.mainLight) this.mainLight.intensity = (strobe * 4 * (1 + amplitude)) * brightness;
                break;
            case 'rainbow':
                const hue = (this.time * 0.1) % 1;
                if (this.mainLight) {
                    this.mainLight.color.setHSL(hue, 0.8, 0.6);
                    this.mainLight.intensity = (2 + amplitude * 2) * brightness;
                }
                if (this.accentLight) this.accentLight.color.setHSL((hue + 0.33) % 1, 0.8, 0.6);
                if (this.backLight) this.backLight.color.setHSL((hue + 0.66) % 1, 0.8, 0.6);
                break;
        }
    }

    updateCamera() {
        this.camera.position.x = Math.sin(this.time * 0.05) * 5;
        this.camera.position.y = Math.cos(this.time * 0.07) * 3;
        this.camera.lookAt(0, 0, 0);
    }

    // =====================================================
    // API
    // =====================================================

    setGeometry(type) { this.settings.geometry = type; this.createCenterGeometry(); }
    setDetail(level) { this.settings.detail = level; this.createCenterGeometry(); }
    setRingsStyle(style) { this.settings.ringsStyle = style; this.createRings(); }
    setRingsCount(count) { this.settings.ringsCount = count; this.createRings(); }
    setSurroundType(type) { this.settings.surroundType = type; this.createSurroundElements(); }
    setSurroundCount(count) { this.settings.surroundCount = count; this.createSurroundElements(); }
    setBackgroundType(type) { this.settings.backgroundType = type; this.createBackgroundElements(); }
    setBackgroundDensity(density) { this.settings.backgroundDensity = density; this.createBackgroundElements(); }
    setBackgroundSpeed(speed) { this.settings.backgroundSpeed = speed; }
    setLightMode(mode) { this.settings.lightMode = mode; }
    setBrightness(val) { this.settings.brightness = val; this.setupLights(); }
    setLightComplexity(val) { this.settings.lightComplexity = val; this.setupLights(); }
    setDepth(val) { this.settings.depth = val; this.updateDepth(); }
    setBloom(val) { this.settings.bloom = val; this.updateBloom(); }
    setFog(val) { this.settings.fog = val; this.updateFog(); }

    randomize() {
        const geoms = ['icosahedron', 'octahedron', 'dodecahedron', 'torusKnot', 'kleinBottle', 'geodesic'];
        const rings = ['orbital', 'saturn', 'gyroscope', 'atomic', 'spiral'];
        const surrounds = ['floatingPolyhedra', 'particles', 'asteroids', 'crystals'];
        const bgs = ['flyingDebris', 'starfield', 'meteors', 'nebula'];
        const lightModes = ['dynamic', 'pulse', 'rainbow'];

        const r = {
            geometry: geoms[Math.floor(Math.random() * geoms.length)],
            detail: Math.floor(Math.random() * 4) + 2,
            rings: rings[Math.floor(Math.random() * rings.length)],
            surround: surrounds[Math.floor(Math.random() * surrounds.length)],
            background: bgs[Math.floor(Math.random() * bgs.length)],
            lightMode: lightModes[Math.floor(Math.random() * lightModes.length)]
        };

        const h1 = Math.random(), h2 = (h1 + 0.3 + Math.random() * 0.3) % 1, h3 = (h2 + 0.2) % 1;
        this.colors.primary.setHSL(h1, 0.8, 0.6);
        this.colors.secondary.setHSL(h2, 0.9, 0.55);
        this.colors.tertiary.setHSL(h3, 0.7, 0.5);

        Object.assign(this.settings, {
            geometry: r.geometry, detail: r.detail, ringsStyle: r.rings,
            surroundType: r.surround, backgroundType: r.background, lightMode: r.lightMode
        });

        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();
        this.createBackgroundElements();
        this.setupLights();

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
        [this.centerGroup, this.ringsGroup, this.surroundGroup, this.backgroundGroup, this.particlesGroup].forEach(g => this.clearGroup(g));
        this.lights.forEach(l => this.scene.remove(l));
        if (this.renderer) { this.renderer.dispose(); this.container.removeChild(this.renderer.domElement); }
    }
}
