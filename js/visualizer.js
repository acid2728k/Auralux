/**
 * Visualizer Module
 * Deep 3D scene with wireframe geometry, glow, and particles
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        
        // Scene objects
        this.centerMesh = null;
        this.wireframeMesh = null;
        this.glowRing = null;
        this.particles = null;
        this.trailParticles = null;
        
        // Settings
        this.geometry = 'icosahedron';
        this.baseScale = 4;
        
        // Colors
        this.colors = {
            primary: new THREE.Color(0xa855f7),    // Purple
            secondary: new THREE.Color(0xff6a00),  // Orange
            white: new THREE.Color(0xffffff),
            dim: new THREE.Color(0x333333)
        };
        
        // Animation state
        this.time = 0;
        this.smoothedAudio = {
            amplitude: 0,
            bass: 0,
            mid: 0,
            treble: 0
        };
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.z = 20;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.setupPostProcessing();

        // Lights
        this.setupLights();

        // Create scene objects
        this.createCenterGeometry();
        this.createGlowRing();
        this.createParticles();
        this.createTrailParticles();

        // Events
        window.addEventListener('resize', () => this.onResize());

        console.log('[Visualizer] Initialized');
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,   // strength
            0.4,   // radius
            0.2    // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }

    setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambient);

        // Main point light
        const pointLight = new THREE.PointLight(0xa855f7, 2, 50);
        pointLight.position.set(0, 0, 15);
        this.scene.add(pointLight);
        this.mainLight = pointLight;

        // Accent light
        const accentLight = new THREE.PointLight(0xff6a00, 0.5, 30);
        accentLight.position.set(-10, 5, 5);
        this.scene.add(accentLight);
        this.accentLight = accentLight;
    }

    createCenterGeometry() {
        // Remove existing
        if (this.centerMesh) {
            this.scene.remove(this.centerMesh);
            this.centerMesh.geometry.dispose();
            this.centerMesh.material.dispose();
        }
        if (this.wireframeMesh) {
            this.scene.remove(this.wireframeMesh);
            this.wireframeMesh.geometry.dispose();
            this.wireframeMesh.material.dispose();
        }

        // Create geometry based on type
        let geometry;
        switch (this.geometry) {
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(this.baseScale, 1);
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(this.baseScale, 0);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(this.baseScale, 0);
                break;
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(this.baseScale * 1.2, 0);
                break;
            case 'sphere':
                geometry = new THREE.IcosahedronGeometry(this.baseScale, 2);
                break;
            case 'torus':
                geometry = new THREE.TorusKnotGeometry(this.baseScale * 0.7, 0.3, 128, 16, 2, 3);
                break;
            default:
                geometry = new THREE.IcosahedronGeometry(this.baseScale, 1);
        }

        // Solid inner mesh (dark, subtle)
        const solidMaterial = new THREE.MeshPhongMaterial({
            color: 0x0a0a0a,
            emissive: 0x111111,
            shininess: 10,
            transparent: true,
            opacity: 0.3
        });
        this.centerMesh = new THREE.Mesh(geometry, solidMaterial);
        this.scene.add(this.centerMesh);

        // Wireframe outer mesh
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.primary,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        this.wireframeMesh = new THREE.Mesh(geometry.clone(), wireframeMaterial);
        this.wireframeMesh.scale.setScalar(1.02);
        this.scene.add(this.wireframeMesh);
    }

    createGlowRing() {
        if (this.glowRing) {
            this.scene.remove(this.glowRing);
            this.glowRing.geometry.dispose();
            this.glowRing.material.dispose();
        }

        // Create a torus ring around the object
        const geometry = new THREE.TorusGeometry(this.baseScale * 1.8, 0.03, 16, 100);
        const material = new THREE.MeshBasicMaterial({
            color: this.colors.secondary,
            transparent: true,
            opacity: 0.6
        });
        
        this.glowRing = new THREE.Mesh(geometry, material);
        this.glowRing.rotation.x = Math.PI / 2;
        this.scene.add(this.glowRing);

        // Second ring at angle
        const geometry2 = new THREE.TorusGeometry(this.baseScale * 2, 0.02, 16, 100);
        const material2 = new THREE.MeshBasicMaterial({
            color: this.colors.primary,
            transparent: true,
            opacity: 0.4
        });
        this.glowRing2 = new THREE.Mesh(geometry2, material2);
        this.glowRing2.rotation.x = Math.PI / 3;
        this.glowRing2.rotation.y = Math.PI / 6;
        this.scene.add(this.glowRing2);
    }

    createParticles() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        const count = 800;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Distribute in a large sphere around scene
            const radius = 15 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            sizes[i] = 0.5 + Math.random() * 1.5;
            opacities[i] = 0.2 + Math.random() * 0.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

        // Store original positions
        geometry.userData.originalPositions = positions.slice();

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createTrailParticles() {
        if (this.trailParticles) {
            this.scene.remove(this.trailParticles);
            this.trailParticles.geometry.dispose();
            this.trailParticles.material.dispose();
        }

        const count = 200;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = this.baseScale * 1.5 + Math.random() * 0.5;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Color gradient purple to orange
            const t = i / count;
            const color = this.colors.primary.clone().lerp(this.colors.secondary, t);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.userData.originalPositions = positions.slice();

        const material = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.trailParticles = new THREE.Points(geometry, material);
        this.scene.add(this.trailParticles);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    setGeometry(type) {
        this.geometry = type;
        this.createCenterGeometry();
        this.createGlowRing();
        this.createTrailParticles();
    }

    randomize() {
        const geometries = ['icosahedron', 'octahedron', 'dodecahedron', 'tetrahedron', 'sphere', 'torus'];
        const randomGeom = geometries[Math.floor(Math.random() * geometries.length)];
        this.setGeometry(randomGeom);

        // Random colors
        const hue1 = Math.random();
        const hue2 = (hue1 + 0.3 + Math.random() * 0.4) % 1;
        
        this.colors.primary.setHSL(hue1, 0.8, 0.6);
        this.colors.secondary.setHSL(hue2, 0.9, 0.55);

        // Update materials
        if (this.wireframeMesh) {
            this.wireframeMesh.material.color.copy(this.colors.primary);
        }
        if (this.glowRing) {
            this.glowRing.material.color.copy(this.colors.secondary);
        }
        if (this.glowRing2) {
            this.glowRing2.material.color.copy(this.colors.primary);
        }
        if (this.mainLight) {
            this.mainLight.color.copy(this.colors.primary);
        }
        if (this.accentLight) {
            this.accentLight.color.copy(this.colors.secondary);
        }

        // Update trail colors
        if (this.trailParticles) {
            const colors = this.trailParticles.geometry.attributes.color.array;
            const count = colors.length / 3;
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const color = this.colors.primary.clone().lerp(this.colors.secondary, t);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            this.trailParticles.geometry.attributes.color.needsUpdate = true;
        }

        return randomGeom;
    }

    update(audioData) {
        const delta = this.clock.getDelta();
        this.time += delta;

        // Smooth audio values
        const smoothing = 0.15;
        this.smoothedAudio.amplitude += (audioData.amplitude - this.smoothedAudio.amplitude) * smoothing;
        this.smoothedAudio.bass += (audioData.bass - this.smoothedAudio.bass) * smoothing;
        this.smoothedAudio.mid += (audioData.mid - this.smoothedAudio.mid) * smoothing;
        this.smoothedAudio.treble += (audioData.treble - this.smoothedAudio.treble) * smoothing;

        const { amplitude, bass, mid, treble } = this.smoothedAudio;

        // Update center geometry
        this.updateCenterGeometry(amplitude, bass, mid, delta);

        // Update glow rings
        this.updateGlowRings(amplitude, bass, mid, delta);

        // Update particles
        this.updateParticles(amplitude, delta);

        // Update trail
        this.updateTrailParticles(audioData, delta);

        // Update lights
        this.updateLights(amplitude, bass, treble);

        // Update bloom
        if (this.bloomPass) {
            this.bloomPass.strength = 0.6 + amplitude * 0.8;
        }

        // Camera subtle movement
        this.camera.position.x = Math.sin(this.time * 0.1) * 2;
        this.camera.position.y = Math.cos(this.time * 0.15) * 1.5;
        this.camera.lookAt(0, 0, 0);

        // Render
        this.composer.render();
    }

    updateCenterGeometry(amplitude, bass, mid, delta) {
        if (!this.centerMesh || !this.wireframeMesh) return;

        // Scale based on bass
        const targetScale = 1 + bass * 0.4;
        this.centerMesh.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            0.1
        );
        this.wireframeMesh.scale.lerp(
            new THREE.Vector3(targetScale * 1.02, targetScale * 1.02, targetScale * 1.02),
            0.1
        );

        // Rotation based on mid
        const rotSpeed = 0.2 + mid * 0.5;
        this.centerMesh.rotation.x += delta * rotSpeed * 0.5;
        this.centerMesh.rotation.y += delta * rotSpeed;
        this.wireframeMesh.rotation.copy(this.centerMesh.rotation);

        // Update wireframe color intensity
        const hsl = {};
        this.colors.primary.getHSL(hsl);
        this.wireframeMesh.material.color.setHSL(hsl.h, hsl.s, 0.4 + amplitude * 0.4);
        this.wireframeMesh.material.opacity = 0.6 + amplitude * 0.4;

        // Update solid mesh emissive
        this.centerMesh.material.emissive.setHSL(hsl.h, 0.5, amplitude * 0.15);
    }

    updateGlowRings(amplitude, bass, mid, delta) {
        if (!this.glowRing || !this.glowRing2) return;

        // Ring 1 - horizontal, reacts to bass
        const scale1 = 1 + bass * 0.3;
        this.glowRing.scale.setScalar(scale1);
        this.glowRing.rotation.z += delta * (0.3 + amplitude * 0.5);
        this.glowRing.material.opacity = 0.3 + bass * 0.5;

        // Ring 2 - angled, reacts to mid
        const scale2 = 1 + mid * 0.25;
        this.glowRing2.scale.setScalar(scale2);
        this.glowRing2.rotation.z -= delta * (0.2 + amplitude * 0.3);
        this.glowRing2.rotation.x += delta * 0.1;
        this.glowRing2.material.opacity = 0.2 + mid * 0.4;
    }

    updateParticles(amplitude, delta) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const original = this.particles.geometry.userData.originalPositions;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Gentle floating motion
            const offset = i * 0.01;
            positions[i3] = original[i3] + Math.sin(this.time * 0.2 + offset) * 0.5;
            positions[i3 + 1] = original[i3 + 1] + Math.cos(this.time * 0.15 + offset) * 0.5;
            positions[i3 + 2] = original[i3 + 2] + Math.sin(this.time * 0.1 + offset * 2) * 0.3;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.material.opacity = 0.4 + amplitude * 0.3;
        this.particles.rotation.y += delta * 0.02;
    }

    updateTrailParticles(audioData, delta) {
        if (!this.trailParticles) return;

        const { frequencies } = audioData;
        const positions = this.trailParticles.geometry.attributes.position.array;
        const original = this.trailParticles.geometry.userData.originalPositions;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const freqIndex = Math.floor((i / count) * (frequencies?.length || 128) * 0.5);
            const freqValue = frequencies?.[freqIndex] || 0;

            // Push outward based on frequency
            const angle = (i / count) * Math.PI * 2 + this.time * 0.5;
            const baseRadius = this.baseScale * 1.5;
            const radius = baseRadius + freqValue * 3;

            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = original[i3 + 1] + Math.sin(this.time * 2 + i * 0.1) * freqValue * 2;
            positions[i3 + 2] = Math.sin(angle) * radius;
        }

        this.trailParticles.geometry.attributes.position.needsUpdate = true;
        this.trailParticles.rotation.y += delta * 0.3;
    }

    updateLights(amplitude, bass, treble) {
        // Main light intensity
        this.mainLight.intensity = 1.5 + amplitude * 2;
        this.mainLight.distance = 40 + bass * 20;

        // Accent light
        this.accentLight.intensity = 0.3 + treble * 1;
        
        // Move accent light
        this.accentLight.position.x = Math.sin(this.time * 0.3) * 15;
        this.accentLight.position.y = Math.cos(this.time * 0.2) * 10;
    }

    renderIdle() {
        const delta = this.clock.getDelta();
        this.time += delta;

        // Idle audio simulation
        const idleData = {
            amplitude: 0.05 + Math.sin(this.time * 0.5) * 0.03,
            bass: 0.04 + Math.sin(this.time * 0.3) * 0.02,
            mid: 0.03 + Math.sin(this.time * 0.4) * 0.02,
            treble: 0.02 + Math.sin(this.time * 0.6) * 0.01,
            frequencies: new Array(128).fill(0).map((_, i) => 
                0.03 + Math.sin(this.time + i * 0.05) * 0.02
            )
        };

        this.update(idleData);
    }

    destroy() {
        window.removeEventListener('resize', () => this.onResize());

        // Dispose geometries and materials
        [this.centerMesh, this.wireframeMesh, this.glowRing, this.glowRing2, this.particles, this.trailParticles].forEach(obj => {
            if (obj) {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            }
        });

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
