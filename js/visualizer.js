/**
 * Visualizer Module
 * Deep 3D scene with customizable elements
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
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
            backgroundDensity: 50
        };
        
        this.baseScale = 4;
        
        // Colors
        this.colors = {
            primary: new THREE.Color(0xa855f7),
            secondary: new THREE.Color(0xff6a00),
            tertiary: new THREE.Color(0x06b6d4),
            white: new THREE.Color(0xffffff)
        };
        
        // Animation
        this.time = 0;
        this.smoothedAudio = { amplitude: 0, bass: 0, mid: 0, treble: 0 };
        
        // Flying objects data
        this.flyingObjects = [];
        
        this.init();
    }

    init() {
        // Scene with deep fog
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000005, 0.008);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 2000);
        this.camera.position.z = 30;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.setupPostProcessing();

        // Lights
        this.setupLights();

        // Groups
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

        // Create all elements
        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();
        this.createBackgroundElements();
        this.createDeepParticles();

        window.addEventListener('resize', () => this.onResize());

        console.log('[Visualizer] Initialized');
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.0, 0.5, 0.1
        );
        this.composer.addPass(this.bloomPass);
    }

    setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x111122, 0.5);
        this.scene.add(ambient);

        // Main light (purple)
        this.mainLight = new THREE.PointLight(0xa855f7, 3, 80);
        this.mainLight.position.set(0, 0, 25);
        this.mainLight.castShadow = true;
        this.scene.add(this.mainLight);

        // Accent light (orange)
        this.accentLight = new THREE.PointLight(0xff6a00, 2, 60);
        this.accentLight.position.set(-20, 15, 10);
        this.scene.add(this.accentLight);

        // Back light (cyan)
        this.backLight = new THREE.PointLight(0x06b6d4, 1.5, 60);
        this.backLight.position.set(15, -10, -20);
        this.scene.add(this.backLight);

        // Rim light
        this.rimLight = new THREE.PointLight(0xffffff, 0.5, 50);
        this.rimLight.position.set(0, 20, -15);
        this.scene.add(this.rimLight);

        // Directional for shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);
    }

    // =====================================================
    // GEOMETRY CREATION
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
            case 'truncatedIcosa': return new THREE.IcosahedronGeometry(s, detail + 2);
            case 'snubCube': return this.createTwistedGeometry(s, detail);
            case 'kleinBottle': return this.createKleinBottle(s, detail);
            case 'mobiusStrip': return this.createMobiusStrip(s, detail);
            case 'hyperCube': return new THREE.BoxGeometry(s * 1.3, s * 1.3, s * 1.3, detail + 2, detail + 2, detail + 2);
            case 'torusKnot': return new THREE.TorusKnotGeometry(s * 0.7, s * 0.25, 100 + detail * 30, 16, 2, 3);
            case 'sierpinski': return this.createSierpinskiTetrahedron(s, Math.min(detail, 4));
            case 'geodesic': return new THREE.IcosahedronGeometry(s, detail + 3);
            default: return new THREE.IcosahedronGeometry(s, detail);
        }
    }

    createTwistedGeometry(size, detail) {
        const geometry = new THREE.IcosahedronGeometry(size, detail + 1);
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const angle = y * 0.4;
            const x = positions[i], z = positions[i + 2];
            positions[i] = x * Math.cos(angle) - z * Math.sin(angle);
            positions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
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

    // =====================================================
    // CENTER
    // =====================================================

    createCenterGeometry() {
        this.clearGroup(this.centerGroup);
        
        const geometry = this.createGeometry(this.settings.geometry, this.settings.detail);

        // Solid core
        const solidMat = new THREE.MeshPhongMaterial({
            color: 0x0a0a0a, emissive: 0x111111,
            transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        this.centerSolid = new THREE.Mesh(geometry, solidMat);
        this.centerSolid.castShadow = true;
        this.centerGroup.add(this.centerSolid);

        // Wireframe
        const wireMat = new THREE.MeshBasicMaterial({
            color: this.colors.primary, wireframe: true, transparent: true, opacity: 0.9
        });
        this.centerWire = new THREE.Mesh(geometry.clone(), wireMat);
        this.centerWire.scale.setScalar(1.01);
        this.centerGroup.add(this.centerWire);

        // Glow shell
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

        switch (ringsStyle) {
            case 'orbital': this.createOrbitalRings(ringsCount); break;
            case 'saturn': this.createSaturnRings(ringsCount); break;
            case 'gyroscope': this.createGyroscopeRings(ringsCount); break;
            case 'atomic': this.createAtomicRings(ringsCount); break;
            case 'spiral': this.createSpiralRings(ringsCount); break;
            case 'cage': this.createCageRings(ringsCount); break;
        }
    }

    createOrbitalRings(count) {
        for (let i = 0; i < count; i++) {
            const radius = this.baseScale * (1.6 + i * 0.4);
            const geometry = new THREE.TorusGeometry(radius, 0.02 + i * 0.005, 16, 100);
            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count),
                transparent: true, opacity: 0.6 - i * 0.08
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI / 2 + (i * Math.PI / count / 2);
            ring.rotation.y = i * 0.3;
            ring.userData = { type: 'orbital', index: i, speed: 0.3 + i * 0.1 };
            this.ringsGroup.add(ring);
        }
    }

    createSaturnRings(count) {
        for (let i = 0; i < count; i++) {
            const innerR = this.baseScale * (1.4 + i * 0.25);
            const outerR = innerR + 0.15 + Math.random() * 0.1;
            const geometry = new THREE.RingGeometry(innerR, outerR, 64);
            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count),
                side: THREE.DoubleSide, transparent: true, opacity: 0.4 - i * 0.04
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI / 2;
            ring.userData = { type: 'saturn', index: i };
            this.ringsGroup.add(ring);
        }
    }

    createGyroscopeRings(count) {
        for (let i = 0; i < count; i++) {
            const radius = this.baseScale * (1.5 + i * 0.35);
            const geometry = new THREE.TorusGeometry(radius, 0.03, 8, 64);
            const material = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? this.colors.primary : this.colors.secondary,
                transparent: true, opacity: 0.7
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = (i * Math.PI) / count;
            ring.rotation.z = (i * Math.PI) / (count * 2);
            ring.userData = { type: 'gyroscope', index: i, axis: i % 3 };
            this.ringsGroup.add(ring);
        }
    }

    createAtomicRings(count) {
        const orbits = Math.min(count, 6);
        for (let i = 0; i < orbits; i++) {
            const radius = this.baseScale * (1.4 + i * 0.5);
            const geometry = new THREE.TorusGeometry(radius, 0.015, 8, 80);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0.3
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = (i * Math.PI) / orbits;
            ring.rotation.y = (i * Math.PI * 0.5) / orbits;
            ring.userData = { type: 'atomicOrbit', index: i };
            this.ringsGroup.add(ring);

            // Electrons
            for (let e = 0; e < 2 + i; e++) {
                const elGeom = new THREE.SphereGeometry(0.12 + i * 0.02, 12, 12);
                const elMat = new THREE.MeshBasicMaterial({ color: this.getGradientColor(e / (2 + i)) });
                const electron = new THREE.Mesh(elGeom, elMat);
                electron.userData = { 
                    type: 'electron', orbitIndex: i, angle: (e / (2 + i)) * Math.PI * 2, 
                    radius, rotX: ring.rotation.x, rotY: ring.rotation.y, speed: 1 + i * 0.3
                };
                this.ringsGroup.add(electron);
            }
        }
    }

    createSpiralRings(count) {
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const radius = this.baseScale * (1.3 + t * 1.5);
            const y = (t - 0.5) * this.baseScale * 2;
            const geometry = new THREE.TorusGeometry(radius, 0.025, 8, 64);
            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(t), transparent: true, opacity: 0.5
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.position.y = y;
            ring.rotation.x = Math.PI / 2;
            ring.userData = { type: 'spiral', index: i, baseY: y };
            this.ringsGroup.add(ring);
        }
    }

    createCageRings(count) {
        for (let i = 0; i < count; i++) {
            const size = this.baseScale * (1.4 + i * 0.3);
            const geometry = i % 2 === 0 
                ? new THREE.IcosahedronGeometry(size, 0)
                : new THREE.DodecahedronGeometry(size, 0);
            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count),
                wireframe: true, transparent: true, opacity: 0.3 - i * 0.03
            });
            const cage = new THREE.Mesh(geometry, material);
            cage.userData = { type: 'cage', index: i };
            this.ringsGroup.add(cage);
        }
    }

    // =====================================================
    // SURROUND
    // =====================================================

    createSurroundElements() {
        this.clearGroup(this.surroundGroup);
        
        const { surroundType, surroundCount } = this.settings;
        if (surroundType === 'none') return;

        switch (surroundType) {
            case 'floatingPolyhedra': this.createFloatingPolyhedra(surroundCount); break;
            case 'particles': this.createParticleField(surroundCount * 10); break;
            case 'asteroids': this.createAsteroids(surroundCount); break;
            case 'crystals': this.createCrystals(surroundCount); break;
        }
    }

    createFloatingPolyhedra(count) {
        const geomTypes = [
            () => new THREE.TetrahedronGeometry(0.3, 0),
            () => new THREE.OctahedronGeometry(0.25, 0),
            () => new THREE.IcosahedronGeometry(0.25, 0),
            () => new THREE.DodecahedronGeometry(0.2, 0)
        ];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = this.baseScale * (2 + Math.random() * 2);
            const y = (Math.random() - 0.5) * this.baseScale * 3;
            
            const geom = geomTypes[i % geomTypes.length]();
            const mat = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count), wireframe: true, transparent: true, opacity: 0.7
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            mesh.userData = { type: 'polyhedron', angle, radius, baseY: y, rotSpeed: 0.5 + Math.random() };
            this.surroundGroup.add(mesh);
        }
    }

    createParticleField(count) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            const radius = this.baseScale * (2 + Math.random() * 4);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            const c = this.getGradientColor(Math.random());
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }
        
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geom.userData.originalPositions = positions.slice();
        
        const mat = new THREE.PointsMaterial({
            size: 0.15, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(geom, mat);
        points.userData = { type: 'particleField' };
        this.surroundGroup.add(points);
    }

    createAsteroids(count) {
        for (let i = 0; i < count; i++) {
            const size = 0.2 + Math.random() * 0.4;
            const geom = new THREE.DodecahedronGeometry(size, 0);
            
            // Distort vertices
            const pos = geom.attributes.position.array;
            for (let j = 0; j < pos.length; j += 3) {
                pos[j] *= 0.8 + Math.random() * 0.4;
                pos[j + 1] *= 0.8 + Math.random() * 0.4;
                pos[j + 2] *= 0.8 + Math.random() * 0.4;
            }
            geom.attributes.position.needsUpdate = true;
            geom.computeVertexNormals();
            
            const mat = new THREE.MeshPhongMaterial({
                color: 0x444444, emissive: 0x111111, flatShading: true
            });
            const asteroid = new THREE.Mesh(geom, mat);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = this.baseScale * (2.5 + Math.random() * 2.5);
            const y = (Math.random() - 0.5) * this.baseScale * 4;
            asteroid.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            asteroid.userData = { type: 'asteroid', angle, radius, baseY: y, rotSpeed: Math.random() * 2 };
            this.surroundGroup.add(asteroid);
        }
    }

    createCrystals(count) {
        for (let i = 0; i < count; i++) {
            const h = 0.3 + Math.random() * 0.5;
            const geom = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, h, 6);
            const mat = new THREE.MeshPhongMaterial({
                color: this.getGradientColor(i / count),
                emissive: this.getGradientColor(i / count),
                emissiveIntensity: 0.3, transparent: true, opacity: 0.8
            });
            const crystal = new THREE.Mesh(geom, mat);
            
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const radius = this.baseScale * (2 + Math.random() * 2);
            const y = (Math.random() - 0.5) * this.baseScale * 3;
            crystal.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            crystal.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
            crystal.userData = { type: 'crystal', angle, radius, baseY: y };
            this.surroundGroup.add(crystal);
        }
    }

    // =====================================================
    // BACKGROUND - FLYING OBJECTS
    // =====================================================

    createBackgroundElements() {
        this.clearGroup(this.backgroundGroup);
        this.flyingObjects = [];
        
        const { backgroundType, backgroundDensity } = this.settings;
        if (backgroundType === 'none') return;

        switch (backgroundType) {
            case 'flyingDebris': this.createFlyingDebris(backgroundDensity); break;
            case 'starfield': this.createStarfield(backgroundDensity * 5); break;
            case 'meteors': this.createMeteors(Math.floor(backgroundDensity / 3)); break;
            case 'nebula': this.createNebula(backgroundDensity * 3); break;
            case 'grid': this.createGridPlane(); break;
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
                emissive: 0x111111, flatShading: true, transparent: true, opacity: 0.8
            });
            const debris = new THREE.Mesh(geom, mat);
            
            // Random position far away
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 100;
            const z = -50 - Math.random() * 150;
            debris.position.set(x, y, z);
            debris.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
            
            debris.userData = {
                type: 'debris',
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.3,
                    2 + Math.random() * 3
                ),
                rotVel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02
                ),
                startZ: z
            };
            
            this.flyingObjects.push(debris);
            this.backgroundGroup.add(debris);
        }
    }

    createStarfield(count) {
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = -20 - Math.random() * 200;
            sizes[i] = 0.5 + Math.random() * 2;
        }
        
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geom.userData.originalPositions = positions.slice();
        
        const mat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
        });
        const stars = new THREE.Points(geom, mat);
        stars.userData = { type: 'starfield' };
        this.backgroundGroup.add(stars);
    }

    createMeteors(count) {
        for (let i = 0; i < count; i++) {
            // Meteor head
            const headGeom = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 8);
            const headMat = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(Math.random())
            });
            const head = new THREE.Mesh(headGeom, headMat);
            
            // Trail
            const trailGeom = new THREE.ConeGeometry(0.3, 3 + Math.random() * 4, 8);
            const trailMat = new THREE.MeshBasicMaterial({
                color: this.colors.secondary, transparent: true, opacity: 0.4
            });
            const trail = new THREE.Mesh(trailGeom, trailMat);
            trail.rotation.x = Math.PI / 2;
            trail.position.z = 2;
            
            const meteor = new THREE.Group();
            meteor.add(head);
            meteor.add(trail);
            
            const x = (Math.random() - 0.5) * 150;
            const y = 30 + Math.random() * 50;
            const z = -100 - Math.random() * 100;
            meteor.position.set(x, y, z);
            meteor.rotation.x = -0.5;
            
            meteor.userData = {
                type: 'meteor',
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    -3 - Math.random() * 3,
                    5 + Math.random() * 5
                ),
                startPos: meteor.position.clone()
            };
            
            this.flyingObjects.push(meteor);
            this.backgroundGroup.add(meteor);
        }
    }

    createNebula(count) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const r = 30 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = -30 - r * Math.cos(phi);
            
            const c = this.getGradientColor(Math.random());
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
            sizes[i] = 1 + Math.random() * 3;
        }
        
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geom.userData.originalPositions = positions.slice();
        
        const mat = new THREE.PointsMaterial({
            size: 0.5, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
        });
        const nebula = new THREE.Points(geom, mat);
        nebula.userData = { type: 'nebula' };
        this.backgroundGroup.add(nebula);
    }

    createGridPlane() {
        const gridHelper = new THREE.GridHelper(200, 50, 0x333333, 0x222222);
        gridHelper.position.y = -20;
        gridHelper.userData = { type: 'grid' };
        this.backgroundGroup.add(gridHelper);

        // Add depth lines
        for (let i = 0; i < 20; i++) {
            const points = [
                new THREE.Vector3((i - 10) * 10, -20, 0),
                new THREE.Vector3((i - 10) * 10, -20, -200)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
            const line = new THREE.Line(geom, mat);
            this.backgroundGroup.add(line);
        }
    }

    // =====================================================
    // DEEP PARTICLES
    // =====================================================

    createDeepParticles() {
        this.clearGroup(this.particlesGroup);
        
        const count = 1000;
        const positions = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = -Math.random() * 300;
        }
        
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.userData.originalPositions = positions.slice();
        
        const mat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.05, transparent: true, opacity: 0.4
        });
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
        if (t < 0.5) {
            return this.colors.primary.clone().lerp(this.colors.secondary, t * 2);
        }
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

        this.updateCenter(amplitude, bass, mid, delta);
        this.updateRings(audioData, delta);
        this.updateSurround(audioData, delta);
        this.updateBackground(delta);
        this.updateLights(amplitude, bass, treble);
        this.updateCamera();

        this.bloomPass.strength = 0.7 + amplitude * 1.0;
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
        this.centerWire.material.opacity = 0.6 + amplitude * 0.4;
    }

    updateRings(audioData, delta) {
        const { amplitude, bass, mid, frequencies } = audioData;
        
        this.ringsGroup.children.forEach((child, idx) => {
            const d = child.userData;
            if (!d.type) return;

            switch (d.type) {
                case 'orbital':
                    child.rotation.z += delta * d.speed * (1 + amplitude);
                    child.scale.setScalar(1 + bass * 0.2);
                    break;
                case 'saturn':
                    child.rotation.z += delta * 0.1;
                    child.scale.setScalar(1 + mid * 0.15);
                    break;
                case 'gyroscope':
                    const axes = ['x', 'y', 'z'];
                    child.rotation[axes[d.axis]] += delta * (0.5 + amplitude) * (d.index % 2 === 0 ? 1 : -1);
                    break;
                case 'atomicOrbit':
                    child.rotation.z += delta * 0.2;
                    break;
                case 'electron':
                    d.angle += delta * d.speed * (1 + amplitude * 2);
                    let x = Math.cos(d.angle) * d.radius;
                    let y = 0;
                    let z = Math.sin(d.angle) * d.radius;
                    // Apply orbit rotation
                    const cosX = Math.cos(d.rotX), sinX = Math.sin(d.rotX);
                    const cosY = Math.cos(d.rotY), sinY = Math.sin(d.rotY);
                    let ny = y * cosX - z * sinX, nz = y * sinX + z * cosX; y = ny; z = nz;
                    let nx = x * cosY + z * sinY; nz = -x * sinY + z * cosY; x = nx; z = nz;
                    child.position.set(x, y, z);
                    child.scale.setScalar(1 + amplitude);
                    break;
                case 'spiral':
                    child.rotation.z += delta * 0.3;
                    child.position.y = d.baseY + Math.sin(this.time + d.index) * 0.3;
                    break;
                case 'cage':
                    child.rotation.x += delta * 0.1 * (d.index % 2 === 0 ? 1 : -1);
                    child.rotation.y += delta * 0.15 * (d.index % 2 === 0 ? -1 : 1);
                    break;
            }
        });
    }

    updateSurround(audioData, delta) {
        const { amplitude, bass, frequencies } = audioData;
        
        this.surroundGroup.children.forEach((child, idx) => {
            const d = child.userData;
            if (!d.type) return;

            switch (d.type) {
                case 'polyhedron':
                case 'crystal':
                    child.rotation.x += delta * (d.rotSpeed || 0.5) * (1 + amplitude);
                    child.rotation.y += delta * (d.rotSpeed || 0.5) * 0.7;
                    child.position.y = d.baseY + Math.sin(this.time + d.angle) * 0.5;
                    break;
                case 'particleField':
                    if (child.geometry.userData.originalPositions) {
                        const pos = child.geometry.attributes.position.array;
                        const orig = child.geometry.userData.originalPositions;
                        for (let i = 0; i < pos.length / 3; i++) {
                            const f = frequencies?.[i % (frequencies.length || 1)] || 0;
                            pos[i * 3] = orig[i * 3] * (1 + f * 0.3);
                            pos[i * 3 + 1] = orig[i * 3 + 1] * (1 + f * 0.3);
                            pos[i * 3 + 2] = orig[i * 3 + 2] * (1 + f * 0.3);
                        }
                        child.geometry.attributes.position.needsUpdate = true;
                    }
                    child.rotation.y += delta * 0.05;
                    break;
                case 'asteroid':
                    child.rotation.x += delta * d.rotSpeed;
                    child.rotation.y += delta * d.rotSpeed * 0.7;
                    d.angle += delta * 0.1;
                    child.position.x = Math.cos(d.angle) * d.radius;
                    child.position.z = Math.sin(d.angle) * d.radius;
                    break;
            }
        });
    }

    updateBackground(delta) {
        // Update flying objects
        this.flyingObjects.forEach(obj => {
            const d = obj.userData;
            
            if (d.type === 'debris') {
                obj.position.add(d.velocity.clone().multiplyScalar(delta * 10));
                obj.rotation.x += d.rotVel.x;
                obj.rotation.y += d.rotVel.y;
                obj.rotation.z += d.rotVel.z;
                
                // Reset if passed camera
                if (obj.position.z > 50) {
                    obj.position.z = d.startZ;
                    obj.position.x = (Math.random() - 0.5) * 200;
                    obj.position.y = (Math.random() - 0.5) * 100;
                }
            } else if (d.type === 'meteor') {
                obj.position.add(d.velocity.clone().multiplyScalar(delta * 10));
                
                if (obj.position.z > 50 || obj.position.y < -80) {
                    obj.position.copy(d.startPos);
                    obj.position.x = (Math.random() - 0.5) * 150;
                }
            }
        });

        // Update starfield/nebula particles
        this.backgroundGroup.children.forEach(child => {
            const d = child.userData;
            if (d.type === 'starfield' || d.type === 'nebula') {
                if (child.geometry.userData.originalPositions) {
                    const pos = child.geometry.attributes.position.array;
                    const orig = child.geometry.userData.originalPositions;
                    for (let i = 0; i < pos.length / 3; i++) {
                        pos[i * 3 + 2] = orig[i * 3 + 2] + Math.sin(this.time * 0.5 + i * 0.01) * 2;
                    }
                    child.geometry.attributes.position.needsUpdate = true;
                }
            }
        });

        // Deep particles drift
        this.particlesGroup.children.forEach(child => {
            if (child.userData.type === 'deepParticles') {
                const pos = child.geometry.attributes.position.array;
                const orig = child.geometry.userData.originalPositions;
                for (let i = 0; i < pos.length / 3; i++) {
                    pos[i * 3] = orig[i * 3] + Math.sin(this.time * 0.1 + i * 0.01) * 2;
                    pos[i * 3 + 1] = orig[i * 3 + 1] + Math.cos(this.time * 0.08 + i * 0.01) * 2;
                }
                child.geometry.attributes.position.needsUpdate = true;
                child.rotation.y += delta * 0.005;
            }
        });
    }

    updateLights(amplitude, bass, treble) {
        this.mainLight.intensity = 2 + amplitude * 3;
        this.accentLight.intensity = 1 + bass * 2;
        this.backLight.intensity = 1 + treble * 2;
        
        this.accentLight.position.x = Math.sin(this.time * 0.3) * 20;
        this.accentLight.position.y = Math.cos(this.time * 0.2) * 15;
        this.backLight.position.x = Math.cos(this.time * 0.25) * 15;
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

    randomize() {
        const geoms = ['icosahedron', 'octahedron', 'dodecahedron', 'torusKnot', 'kleinBottle', 'geodesic'];
        const rings = ['orbital', 'saturn', 'gyroscope', 'atomic', 'spiral'];
        const surrounds = ['floatingPolyhedra', 'particles', 'asteroids', 'crystals'];
        const bgs = ['flyingDebris', 'starfield', 'meteors', 'nebula'];

        const newGeom = geoms[Math.floor(Math.random() * geoms.length)];
        const newRings = rings[Math.floor(Math.random() * rings.length)];
        const newSurround = surrounds[Math.floor(Math.random() * surrounds.length)];
        const newBg = bgs[Math.floor(Math.random() * bgs.length)];
        const newDetail = Math.floor(Math.random() * 4) + 2;

        // Random colors
        const h1 = Math.random(), h2 = (h1 + 0.3 + Math.random() * 0.3) % 1, h3 = (h2 + 0.2) % 1;
        this.colors.primary.setHSL(h1, 0.8, 0.6);
        this.colors.secondary.setHSL(h2, 0.9, 0.55);
        this.colors.tertiary.setHSL(h3, 0.7, 0.5);

        this.settings.geometry = newGeom;
        this.settings.detail = newDetail;
        this.settings.ringsStyle = newRings;
        this.settings.surroundType = newSurround;
        this.settings.backgroundType = newBg;

        this.createCenterGeometry();
        this.createRings();
        this.createSurroundElements();
        this.createBackgroundElements();

        this.mainLight.color.copy(this.colors.primary);
        this.accentLight.color.copy(this.colors.secondary);
        this.backLight.color.copy(this.colors.tertiary);

        return { geometry: newGeom, detail: newDetail, rings: newRings, surround: newSurround, background: newBg };
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
        if (this.renderer) { this.renderer.dispose(); this.container.removeChild(this.renderer.domElement); }
    }
}
