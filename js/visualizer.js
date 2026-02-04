/**
 * Visualizer Module
 * Three.js based reactive 3D visualization
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Visualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Visualization objects
        this.meshes = [];
        this.currentShape = 'sphere';
        this.particleSystem = null;
        
        // Settings
        this.settings = {
            sensitivity: 1.5,
            rotationSpeed: 0.5,
            colorMode: 'spectrum'
        };
        
        // Color palettes
        this.colorPalettes = {
            spectrum: [
                new THREE.Color(0xa855f7), // Purple
                new THREE.Color(0x06b6d4), // Cyan
                new THREE.Color(0xff6b2c), // Orange
                new THREE.Color(0x22d3ee), // Light cyan
                new THREE.Color(0xc084fc)  // Light purple
            ],
            purple: [
                new THREE.Color(0x7c3aed),
                new THREE.Color(0xa855f7),
                new THREE.Color(0xc084fc),
                new THREE.Color(0xe879f9),
                new THREE.Color(0xf0abfc)
            ],
            cyan: [
                new THREE.Color(0x0891b2),
                new THREE.Color(0x06b6d4),
                new THREE.Color(0x22d3ee),
                new THREE.Color(0x67e8f9),
                new THREE.Color(0xa5f3fc)
            ],
            fire: [
                new THREE.Color(0xff4500),
                new THREE.Color(0xff6b2c),
                new THREE.Color(0xffa500),
                new THREE.Color(0xffcc00),
                new THREE.Color(0xffff00)
            ],
            monochrome: [
                new THREE.Color(0xffffff),
                new THREE.Color(0xcccccc),
                new THREE.Color(0x999999),
                new THREE.Color(0x666666),
                new THREE.Color(0x333333)
            ]
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
        this.scene.background = new THREE.Color(0x0a0a0f);
        this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);
        
        // Create camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.z = 30;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        // Add point lights
        const pointLight1 = new THREE.PointLight(0xa855f7, 1, 100);
        pointLight1.position.set(20, 20, 20);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x06b6d4, 1, 100);
        pointLight2.position.set(-20, -20, 20);
        this.scene.add(pointLight2);
        
        const pointLight3 = new THREE.PointLight(0xff6b2c, 0.5, 100);
        pointLight3.position.set(0, 0, -20);
        this.scene.add(pointLight3);
        
        // Create initial visualization
        this.createVisualization(this.currentShape);
        
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
     * Create visualization based on shape type
     */
    createVisualization(shape) {
        // Clear existing meshes
        this.clearMeshes();
        this.currentShape = shape;
        
        switch (shape) {
            case 'sphere':
                this.createSphereGrid();
                break;
            case 'torus':
                this.createTorusRing();
                break;
            case 'cube':
                this.createCubeMatrix();
                break;
            case 'spiral':
                this.createSpiralHelix();
                break;
            case 'wave':
                this.createWaveField();
                break;
            case 'particles':
                this.createParticleCloud();
                break;
            default:
                this.createSphereGrid();
        }
    }

    /**
     * Clear all meshes from scene
     */
    clearMeshes() {
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.meshes = [];
        
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
            this.particleSystem = null;
        }
    }

    /**
     * Create sphere grid visualization (25+ spheres)
     */
    createSphereGrid() {
        const count = 25;
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshPhongMaterial({
                color: this.getColor(i / count),
                emissive: this.getColor(i / count),
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Arrange in a spherical pattern
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            mesh.position.x = 10 * Math.cos(theta) * Math.sin(phi);
            mesh.position.y = 10 * Math.sin(theta) * Math.sin(phi);
            mesh.position.z = 10 * Math.cos(phi);
            
            mesh.userData = {
                originalPosition: mesh.position.clone(),
                originalScale: 1,
                index: i,
                phase: (i / count) * Math.PI * 2
            };
            
            this.meshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    /**
     * Create torus ring visualization (24 segments)
     */
    createTorusRing() {
        const count = 24;
        const radius = 12;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            
            const geometry = new THREE.TorusGeometry(1, 0.3, 16, 32);
            const material = new THREE.MeshPhongMaterial({
                color: this.getColor(i / count),
                emissive: this.getColor(i / count),
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.85
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.sin(angle) * radius;
            mesh.position.z = 0;
            
            mesh.rotation.x = Math.PI / 2;
            mesh.rotation.z = angle;
            
            mesh.userData = {
                originalPosition: mesh.position.clone(),
                originalScale: 1,
                index: i,
                angle: angle
            };
            
            this.meshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    /**
     * Create cube matrix visualization (27 cubes - 3x3x3)
     */
    createCubeMatrix() {
        const gridSize = 3;
        const spacing = 4;
        const offset = (gridSize - 1) * spacing / 2;
        
        let index = 0;
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    const geometry = new THREE.BoxGeometry(2, 2, 2);
                    const material = new THREE.MeshPhongMaterial({
                        color: this.getColor(index / 27),
                        emissive: this.getColor(index / 27),
                        emissiveIntensity: 0.2,
                        transparent: true,
                        opacity: 0.8,
                        wireframe: false
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    
                    mesh.position.x = x * spacing - offset;
                    mesh.position.y = y * spacing - offset;
                    mesh.position.z = z * spacing - offset;
                    
                    mesh.userData = {
                        originalPosition: mesh.position.clone(),
                        originalScale: 1,
                        index: index,
                        gridPos: { x, y, z }
                    };
                    
                    this.meshes.push(mesh);
                    this.scene.add(mesh);
                    index++;
                }
            }
        }
    }

    /**
     * Create spiral helix visualization (40 elements)
     */
    createSpiralHelix() {
        const count = 40;
        const turns = 3;
        const height = 20;
        const radius = 8;
        
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * Math.PI * 2 * turns;
            const y = (t - 0.5) * height;
            
            const geometry = new THREE.OctahedronGeometry(0.6, 0);
            const material = new THREE.MeshPhongMaterial({
                color: this.getColor(t),
                emissive: this.getColor(t),
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.9,
                flatShading: true
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = y;
            mesh.position.z = Math.sin(angle) * radius;
            
            mesh.userData = {
                originalPosition: mesh.position.clone(),
                originalScale: 1,
                index: i,
                angle: angle,
                t: t
            };
            
            this.meshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    /**
     * Create wave field visualization (100 points - 10x10 grid)
     */
    createWaveField() {
        const gridSize = 10;
        const spacing = 2.5;
        const offset = (gridSize - 1) * spacing / 2;
        
        let index = 0;
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
                const material = new THREE.MeshPhongMaterial({
                    color: this.getColor(index / 100),
                    emissive: this.getColor(index / 100),
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.85
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                
                mesh.position.x = x * spacing - offset;
                mesh.position.y = 0;
                mesh.position.z = z * spacing - offset;
                
                mesh.userData = {
                    originalPosition: mesh.position.clone(),
                    originalScale: { x: 1, y: 1, z: 1 },
                    index: index,
                    gridPos: { x, z }
                };
                
                this.meshes.push(mesh);
                this.scene.add(mesh);
                index++;
            }
        }
    }

    /**
     * Create particle cloud visualization (500 particles)
     */
    createParticleCloud() {
        const count = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            // Random position in a sphere
            const radius = 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.cbrt(Math.random()) * radius;
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            
            const color = this.getColor(i / count);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            sizes[i] = Math.random() * 0.5 + 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Store original positions for animation
        geometry.userData = {
            originalPositions: positions.slice()
        };
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    /**
     * Get color from current palette
     */
    getColor(t) {
        const palette = this.colorPalettes[this.settings.colorMode] || this.colorPalettes.spectrum;
        const index = Math.floor(t * (palette.length - 1));
        const nextIndex = Math.min(index + 1, palette.length - 1);
        const blend = (t * (palette.length - 1)) % 1;
        
        return palette[index].clone().lerp(palette[nextIndex], blend);
    }

    /**
     * Update visualization with audio data
     */
    update(audioData) {
        this.audioData = audioData;
        const delta = this.clock.getDelta();
        this.time += delta;
        
        const { amplitude, bass, mid, treble, peak, frequencies } = audioData;
        const sensitivity = this.settings.sensitivity;
        const rotationSpeed = this.settings.rotationSpeed;
        
        // Update based on current shape
        if (this.currentShape === 'particles') {
            this.updateParticles(audioData, delta);
        } else {
            this.updateMeshes(audioData, delta);
        }
        
        // Global scene rotation
        if (this.meshes.length > 0 || this.particleSystem) {
            const rotationAmount = rotationSpeed * delta * (1 + amplitude * 0.5);
            this.scene.rotation.y += rotationAmount;
        }
        
        // Camera movement based on bass
        const cameraZ = 30 - bass * 5 * sensitivity;
        this.camera.position.z += (cameraZ - this.camera.position.z) * 0.05;
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update mesh-based visualizations
     */
    updateMeshes(audioData, delta) {
        const { amplitude, bass, mid, treble, peak, frequencies } = audioData;
        const sensitivity = this.settings.sensitivity;
        
        this.meshes.forEach((mesh, i) => {
            const userData = mesh.userData;
            const freqIndex = Math.floor((i / this.meshes.length) * frequencies.length * 0.5);
            const freqValue = frequencies[freqIndex] || 0;
            
            // Scale based on frequency and amplitude
            let scale;
            switch (this.currentShape) {
                case 'wave':
                    // For wave field, scale Y (height)
                    const waveScale = 1 + freqValue * 8 * sensitivity;
                    mesh.scale.y = waveScale;
                    mesh.position.y = waveScale / 2;
                    break;
                    
                case 'sphere':
                    // Pulsate outward from center
                    scale = 1 + freqValue * 2 * sensitivity;
                    mesh.scale.setScalar(scale);
                    
                    const direction = userData.originalPosition.clone().normalize();
                    const pushOut = amplitude * 3 * sensitivity;
                    mesh.position.copy(userData.originalPosition).add(direction.multiplyScalar(pushOut));
                    break;
                    
                case 'torus':
                    // Rotate and scale
                    scale = 1 + freqValue * 1.5 * sensitivity;
                    mesh.scale.setScalar(scale);
                    mesh.rotation.x += delta * (1 + bass * 2);
                    mesh.rotation.y += delta * (1 + mid);
                    break;
                    
                case 'cube':
                    // Expand and rotate
                    scale = 1 + freqValue * 1.2 * sensitivity;
                    mesh.scale.setScalar(scale);
                    mesh.rotation.x += delta * bass * 2;
                    mesh.rotation.y += delta * mid * 2;
                    mesh.rotation.z += delta * treble * 2;
                    break;
                    
                case 'spiral':
                    // Expand helix and rotate
                    scale = 1 + freqValue * 1.5 * sensitivity;
                    mesh.scale.setScalar(scale);
                    
                    const spiralPush = amplitude * 2 * sensitivity;
                    const newAngle = userData.angle + this.time * 0.5;
                    mesh.position.x = Math.cos(newAngle) * (8 + spiralPush);
                    mesh.position.z = Math.sin(newAngle) * (8 + spiralPush);
                    mesh.rotation.x += delta * 2;
                    mesh.rotation.y += delta * 2;
                    break;
            }
            
            // Update color based on audio
            if (mesh.material && mesh.material.emissive) {
                const colorT = (i / this.meshes.length + this.time * 0.1) % 1;
                const newColor = this.getColor(colorT);
                mesh.material.color.lerp(newColor, 0.1);
                mesh.material.emissive.lerp(newColor, 0.1);
                mesh.material.emissiveIntensity = 0.2 + freqValue * 0.5 * sensitivity;
                mesh.material.opacity = 0.7 + freqValue * 0.3;
            }
        });
    }

    /**
     * Update particle system
     */
    updateParticles(audioData, delta) {
        if (!this.particleSystem) return;
        
        const { amplitude, bass, mid, treble, frequencies } = audioData;
        const sensitivity = this.settings.sensitivity;
        
        const positions = this.particleSystem.geometry.attributes.position.array;
        const originalPositions = this.particleSystem.geometry.userData.originalPositions;
        const colors = this.particleSystem.geometry.attributes.color.array;
        
        const particleCount = positions.length / 3;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const freqIndex = Math.floor((i / particleCount) * frequencies.length * 0.3);
            const freqValue = frequencies[freqIndex] || 0;
            
            // Expand based on audio
            const expansion = 1 + freqValue * sensitivity;
            positions[i3] = originalPositions[i3] * expansion;
            positions[i3 + 1] = originalPositions[i3 + 1] * expansion;
            positions[i3 + 2] = originalPositions[i3 + 2] * expansion;
            
            // Add some movement
            const noise = Math.sin(this.time * 2 + i * 0.1) * amplitude * 0.5;
            positions[i3] += noise;
            positions[i3 + 1] += Math.cos(this.time * 2 + i * 0.1) * amplitude * 0.5;
            
            // Update color
            const colorT = (i / particleCount + this.time * 0.05) % 1;
            const newColor = this.getColor(colorT);
            colors[i3] = newColor.r;
            colors[i3 + 1] = newColor.g;
            colors[i3 + 2] = newColor.b;
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
        
        // Update particle size based on amplitude
        this.particleSystem.material.size = 0.3 + amplitude * 0.5 * sensitivity;
        
        // Rotate particle system
        this.particleSystem.rotation.y += delta * 0.2;
        this.particleSystem.rotation.x += delta * 0.1 * bass;
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        Object.assign(this.settings, settings);
        
        // Recreate visualization if color mode changed (to update colors)
        if (settings.colorMode !== undefined) {
            this.createVisualization(this.currentShape);
        }
    }

    /**
     * Set shape type
     */
    setShape(shape) {
        if (shape !== this.currentShape) {
            this.createVisualization(shape);
        }
    }

    /**
     * Render a single frame without audio (idle state)
     */
    renderIdle() {
        const delta = this.clock.getDelta();
        this.time += delta;
        
        // Gentle idle animation
        const idleData = {
            amplitude: 0.05 + Math.sin(this.time) * 0.02,
            bass: 0.03 + Math.sin(this.time * 0.5) * 0.02,
            mid: 0.03 + Math.sin(this.time * 0.7) * 0.02,
            treble: 0.02 + Math.sin(this.time * 0.9) * 0.01,
            peak: 0,
            frequencies: new Array(128).fill(0).map((_, i) => 
                0.02 + Math.sin(this.time + i * 0.1) * 0.02
            )
        };
        
        this.update(idleData);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearMeshes();
        
        window.removeEventListener('resize', this.onResize.bind(this));
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}
