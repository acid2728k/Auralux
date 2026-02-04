/**
 * Visualizer Module
 * Deep 3D scene with complex geometries, wireframes, and particles
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
        
        // Scene objects
        this.centerGroup = null;
        this.surroundGroup = null;
        this.particles = null;
        
        // Settings
        this.settings = {
            geometry: 'icosahedron',
            detail: 3,
            surroundType: 'orbitalRings',
            surroundCount: 24,
            surroundComplexity: 2
        };
        
        this.baseScale = 4;
        
        // Colors
        this.colors = {
            primary: new THREE.Color(0xa855f7),
            secondary: new THREE.Color(0xff6a00),
            white: new THREE.Color(0xffffff)
        };
        
        // Animation
        this.time = 0;
        this.smoothedAudio = { amplitude: 0, bass: 0, mid: 0, treble: 0 };
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.015);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.z = 25;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.setupPostProcessing();

        // Lights
        this.setupLights();

        // Groups
        this.centerGroup = new THREE.Group();
        this.surroundGroup = new THREE.Group();
        this.scene.add(this.centerGroup);
        this.scene.add(this.surroundGroup);

        // Create scene
        this.createCenterGeometry();
        this.createSurroundElements();
        this.createBackgroundParticles();

        // Events
        window.addEventListener('resize', () => this.onResize());

        console.log('[Visualizer] Initialized');
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.7, 0.4, 0.2
        );
        this.composer.addPass(this.bloomPass);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(ambient);

        this.mainLight = new THREE.PointLight(0xa855f7, 2, 60);
        this.mainLight.position.set(0, 0, 20);
        this.scene.add(this.mainLight);

        this.accentLight = new THREE.PointLight(0xff6a00, 0.8, 40);
        this.accentLight.position.set(-15, 10, 10);
        this.scene.add(this.accentLight);

        this.backLight = new THREE.PointLight(0x06b6d4, 0.5, 40);
        this.backLight.position.set(10, -10, -15);
        this.scene.add(this.backLight);
    }

    // =====================================================
    // GEOMETRY GENERATORS
    // =====================================================

    createGeometry(type, detail) {
        const d = detail;
        const s = this.baseScale;

        switch (type) {
            // Platonic Solids
            case 'tetrahedron':
                return new THREE.TetrahedronGeometry(s * 1.2, d);
            case 'hexahedron':
                return new THREE.BoxGeometry(s * 1.4, s * 1.4, s * 1.4, d * 2, d * 2, d * 2);
            case 'octahedron':
                return new THREE.OctahedronGeometry(s, d);
            case 'dodecahedron':
                return new THREE.DodecahedronGeometry(s, d);
            case 'icosahedron':
                return new THREE.IcosahedronGeometry(s, d);

            // Complex Polyhedra
            case 'stellatedOcta':
                return this.createStellatedOctahedron(s, d);
            case 'stellatedDodeca':
                return this.createStellatedDodecahedron(s, d);
            case 'truncatedIcosa':
                return new THREE.IcosahedronGeometry(s, d + 1);
            case 'rhombicubocta':
                return this.createRhombicuboctahedron(s, d);
            case 'snubCube':
                return this.createSnubCube(s, d);

            // Paradox Shapes
            case 'penrose':
                return this.createPenroseTriangle(s);
            case 'kleinBottle':
                return this.createKleinBottle(s, d);
            case 'mobiusStrip':
                return this.createMobiusStrip(s, d);
            case 'hyperCube':
                return this.createHypercube(s);
            case 'torusKnot':
                return new THREE.TorusKnotGeometry(s * 0.7, s * 0.2, 128 + d * 32, 16 + d * 4, 2, 3);

            // Fractal-like
            case 'sierpinski':
                return this.createSierpinskiTetrahedron(s, Math.min(d, 4));
            case 'mengerSponge':
                return this.createMengerSponge(s, Math.min(d, 3));
            case 'geodesic':
                return new THREE.IcosahedronGeometry(s, d + 2);

            default:
                return new THREE.IcosahedronGeometry(s, d);
        }
    }

    createStellatedOctahedron(size, detail) {
        const geometry = new THREE.BufferGeometry();
        const s = size;
        
        // Octahedron vertices
        const vertices = [
            0, s, 0,    0, -s, 0,
            s, 0, 0,    -s, 0, 0,
            0, 0, s,    0, 0, -s
        ];
        
        // Stellated points (extended)
        const ext = s * 1.5;
        const stellated = [
            ext, ext, ext,    ext, ext, -ext,
            ext, -ext, ext,   ext, -ext, -ext,
            -ext, ext, ext,   -ext, ext, -ext,
            -ext, -ext, ext,  -ext, -ext, -ext
        ];
        
        const allVerts = [...vertices, ...stellated];
        
        // Create triangulated mesh
        const indices = [];
        // Original octahedron faces
        const octaFaces = [
            0, 2, 4,  0, 4, 3,  0, 3, 5,  0, 5, 2,
            1, 4, 2,  1, 3, 4,  1, 5, 3,  1, 2, 5
        ];
        indices.push(...octaFaces);
        
        // Add stellations
        for (let i = 6; i < 14; i++) {
            indices.push(0, 2, i);
            indices.push(1, 4, i);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVerts, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Fallback to detailed octahedron
        return new THREE.OctahedronGeometry(size * 1.2, detail + 1);
    }

    createStellatedDodecahedron(size, detail) {
        // Use dodecahedron with extended detail as approximation
        return new THREE.DodecahedronGeometry(size * 1.1, detail + 1);
    }

    createRhombicuboctahedron(size, detail) {
        // Approximate with high-detail icosahedron
        return new THREE.IcosahedronGeometry(size, detail + 2);
    }

    createSnubCube(size, detail) {
        // Approximate with detailed geometry
        const geometry = new THREE.IcosahedronGeometry(size, detail + 1);
        // Apply slight twist
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const angle = y * 0.3;
            const x = positions[i];
            const z = positions[i + 2];
            positions[i] = x * Math.cos(angle) - z * Math.sin(angle);
            positions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    }

    createPenroseTriangle(size) {
        // Create impossible triangle illusion shape
        const shape = new THREE.Shape();
        const s = size * 0.4;
        
        // Outer triangle
        shape.moveTo(0, s * 2);
        shape.lineTo(s * 1.73, -s);
        shape.lineTo(-s * 1.73, -s);
        shape.closePath();
        
        // Inner cutout
        const hole = new THREE.Path();
        hole.moveTo(0, s * 0.8);
        hole.lineTo(s * 0.7, -s * 0.4);
        hole.lineTo(-s * 0.7, -s * 0.4);
        hole.closePath();
        shape.holes.push(hole);
        
        const extrudeSettings = { depth: s * 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        return geometry;
    }

    createKleinBottle(size, detail) {
        const geometry = new THREE.ParametricGeometry((u, v, target) => {
            u *= Math.PI * 2;
            v *= Math.PI * 2;
            const s = size * 0.3;
            
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
        }, 64 + detail * 16, 16 + detail * 4);
        
        return geometry;
    }

    createMobiusStrip(size, detail) {
        const geometry = new THREE.ParametricGeometry((u, v, target) => {
            u = u * Math.PI * 2;
            v = (v - 0.5) * 2;
            const s = size * 0.8;
            
            const x = (1 + v / 2 * Math.cos(u / 2)) * Math.cos(u) * s;
            const y = (1 + v / 2 * Math.cos(u / 2)) * Math.sin(u) * s;
            const z = v / 2 * Math.sin(u / 2) * s;
            
            target.set(x, y, z);
        }, 64 + detail * 16, 8 + detail * 2);
        
        return geometry;
    }

    createHypercube(size) {
        // 4D hypercube (tesseract) projected to 3D
        const geometry = new THREE.BufferGeometry();
        const s = size * 0.6;
        
        // 4D vertices projected to 3D
        const vertices = [];
        const w = 0.7; // 4th dimension projection factor
        
        for (let i = 0; i < 16; i++) {
            const x = (i & 1 ? 1 : -1) * s;
            const y = (i & 2 ? 1 : -1) * s;
            const z = (i & 4 ? 1 : -1) * s;
            const w4 = (i & 8 ? 1 : -1);
            
            // Project from 4D to 3D
            const scale = 1 / (2 - w4 * w);
            vertices.push(x * scale, y * scale, z * scale);
        }
        
        // Edges connecting vertices
        const indices = [];
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                const diff = i ^ j;
                // Connect if only one bit differs (adjacent in hypercube)
                if (diff && (diff & (diff - 1)) === 0) {
                    indices.push(i, j);
                }
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        
        // Return as box geometry for solid mesh
        return new THREE.BoxGeometry(s * 1.5, s * 1.5, s * 1.5, 4, 4, 4);
    }

    createSierpinskiTetrahedron(size, depth) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        
        const addTetrahedron = (v0, v1, v2, v3, d) => {
            if (d === 0) {
                const idx = vertices.length / 3;
                vertices.push(...v0, ...v1, ...v2, ...v3);
                // 4 faces
                indices.push(idx, idx + 1, idx + 2);
                indices.push(idx, idx + 2, idx + 3);
                indices.push(idx, idx + 3, idx + 1);
                indices.push(idx + 1, idx + 3, idx + 2);
                return;
            }
            
            // Midpoints
            const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
            const m01 = mid(v0, v1), m02 = mid(v0, v2), m03 = mid(v0, v3);
            const m12 = mid(v1, v2), m13 = mid(v1, v3), m23 = mid(v2, v3);
            
            // 4 smaller tetrahedra
            addTetrahedron(v0, m01, m02, m03, d - 1);
            addTetrahedron(m01, v1, m12, m13, d - 1);
            addTetrahedron(m02, m12, v2, m23, d - 1);
            addTetrahedron(m03, m13, m23, v3, d - 1);
        };
        
        const s = size;
        const h = s * Math.sqrt(2 / 3);
        const v0 = [0, h, 0];
        const v1 = [-s, -h / 3, s * 0.577];
        const v2 = [s, -h / 3, s * 0.577];
        const v3 = [0, -h / 3, -s * 1.155];
        
        addTetrahedron(v0, v1, v2, v3, depth);
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }

    createMengerSponge(size, depth) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        
        const addCube = (x, y, z, s, d) => {
            if (d === 0) {
                const idx = vertices.length / 3;
                const hs = s / 2;
                
                // 8 vertices
                for (let i = 0; i < 8; i++) {
                    vertices.push(
                        x + (i & 1 ? hs : -hs),
                        y + (i & 2 ? hs : -hs),
                        z + (i & 4 ? hs : -hs)
                    );
                }
                
                // 6 faces (2 triangles each)
                const faces = [
                    [0, 1, 3, 2], [4, 6, 7, 5], // front, back
                    [0, 4, 5, 1], [2, 3, 7, 6], // bottom, top
                    [0, 2, 6, 4], [1, 5, 7, 3]  // left, right
                ];
                faces.forEach(f => {
                    indices.push(idx + f[0], idx + f[1], idx + f[2]);
                    indices.push(idx + f[0], idx + f[2], idx + f[3]);
                });
                return;
            }
            
            const ns = s / 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    for (let k = 0; k < 3; k++) {
                        // Skip middle of each face and center
                        const sum = (i === 1 ? 1 : 0) + (j === 1 ? 1 : 0) + (k === 1 ? 1 : 0);
                        if (sum < 2) {
                            addCube(
                                x + (i - 1) * ns,
                                y + (j - 1) * ns,
                                z + (k - 1) * ns,
                                ns, d - 1
                            );
                        }
                    }
                }
            }
        };
        
        addCube(0, 0, 0, size * 1.5, depth);
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }

    // =====================================================
    // CENTER GEOMETRY
    // =====================================================

    createCenterGeometry() {
        // Clear existing
        while (this.centerGroup.children.length) {
            const child = this.centerGroup.children[0];
            this.centerGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        const geometry = this.createGeometry(this.settings.geometry, this.settings.detail);

        // Solid inner mesh
        const solidMat = new THREE.MeshPhongMaterial({
            color: 0x080808,
            emissive: 0x111111,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.centerSolid = new THREE.Mesh(geometry, solidMat);
        this.centerGroup.add(this.centerSolid);

        // Wireframe
        const wireMat = new THREE.MeshBasicMaterial({
            color: this.colors.primary,
            wireframe: true,
            transparent: true,
            opacity: 0.85
        });
        this.centerWire = new THREE.Mesh(geometry.clone(), wireMat);
        this.centerWire.scale.setScalar(1.01);
        this.centerGroup.add(this.centerWire);

        // Outer glow wireframe
        const glowMat = new THREE.MeshBasicMaterial({
            color: this.colors.secondary,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        this.centerGlow = new THREE.Mesh(geometry.clone(), glowMat);
        this.centerGlow.scale.setScalar(1.08);
        this.centerGroup.add(this.centerGlow);
    }

    // =====================================================
    // SURROUND ELEMENTS
    // =====================================================

    createSurroundElements() {
        // Clear existing
        while (this.surroundGroup.children.length) {
            const child = this.surroundGroup.children[0];
            this.surroundGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }

        const { surroundType, surroundCount, surroundComplexity } = this.settings;

        switch (surroundType) {
            case 'orbitalRings':
                this.createOrbitalRings(surroundCount, surroundComplexity);
                break;
            case 'floatingPolyhedra':
                this.createFloatingPolyhedra(surroundCount, surroundComplexity);
                break;
            case 'wireframeCage':
                this.createWireframeCage(surroundCount, surroundComplexity);
                break;
            case 'spiralArms':
                this.createSpiralArms(surroundCount, surroundComplexity);
                break;
            case 'particleCloud':
                this.createParticleCloud(surroundCount * 20, surroundComplexity);
                break;
            case 'concentricSpheres':
                this.createConcentricSpheres(Math.min(surroundCount / 4, 8), surroundComplexity);
                break;
            case 'dnaHelix':
                this.createDNAHelix(surroundCount, surroundComplexity);
                break;
            case 'atomicOrbits':
                this.createAtomicOrbits(Math.min(surroundCount / 4, 12), surroundComplexity);
                break;
            case 'none':
            default:
                break;
        }
    }

    createOrbitalRings(count, complexity) {
        const ringCount = 3 + complexity;
        
        for (let r = 0; r < ringCount; r++) {
            const radius = this.baseScale * (1.8 + r * 0.5);
            const segments = 64 + complexity * 32;
            const tubeRadius = 0.02 + complexity * 0.01;
            
            const geometry = new THREE.TorusGeometry(radius, tubeRadius, 8, segments);
            const material = new THREE.MeshBasicMaterial({
                color: r % 2 === 0 ? this.colors.primary : this.colors.secondary,
                transparent: true,
                opacity: 0.5 - r * 0.08
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = (r * Math.PI) / ringCount;
            ring.rotation.y = (r * Math.PI * 0.5) / ringCount;
            ring.userData = { type: 'ring', index: r, baseRadius: radius };
            
            this.surroundGroup.add(ring);
        }

        // Add orbital particles
        for (let i = 0; i < count; i++) {
            const ringIdx = i % ringCount;
            const radius = this.baseScale * (1.8 + ringIdx * 0.5);
            const angle = (i / count) * Math.PI * 2;
            
            const size = 0.08 + complexity * 0.04;
            const geom = complexity > 2 
                ? new THREE.OctahedronGeometry(size, 0)
                : new THREE.SphereGeometry(size, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: this.colors.white,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geom, mat);
            particle.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            particle.userData = { type: 'orbitalParticle', angle, radius, ringIdx };
            
            this.surroundGroup.add(particle);
        }
    }

    createFloatingPolyhedra(count, complexity) {
        const geometryTypes = [
            () => new THREE.TetrahedronGeometry(0.3 + complexity * 0.1, 0),
            () => new THREE.OctahedronGeometry(0.25 + complexity * 0.1, 0),
            () => new THREE.IcosahedronGeometry(0.25 + complexity * 0.1, complexity > 2 ? 1 : 0),
            () => new THREE.DodecahedronGeometry(0.25 + complexity * 0.08, 0)
        ];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = this.baseScale * (1.5 + Math.random() * 2);
            const y = (Math.random() - 0.5) * this.baseScale * 2;
            
            const geomFn = geometryTypes[i % geometryTypes.length];
            const geometry = geomFn();
            
            // Wireframe
            const wireMat = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count),
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });
            
            const mesh = new THREE.Mesh(geometry, wireMat);
            mesh.position.set(
                Math.cos(angle) * radius,
                y,
                Math.sin(angle) * radius
            );
            mesh.userData = { 
                type: 'polyhedron', 
                angle, 
                radius, 
                baseY: y,
                rotSpeed: 0.5 + Math.random() * 1.5
            };
            
            this.surroundGroup.add(mesh);
        }
    }

    createWireframeCage(count, complexity) {
        // Nested cages
        const cageCount = 2 + Math.floor(complexity / 2);
        
        for (let c = 0; c < cageCount; c++) {
            const size = this.baseScale * (1.5 + c * 0.8);
            const detail = complexity;
            
            const geometry = c % 2 === 0
                ? new THREE.IcosahedronGeometry(size, detail)
                : new THREE.DodecahedronGeometry(size, detail);
            
            const material = new THREE.MeshBasicMaterial({
                color: c % 2 === 0 ? this.colors.primary : this.colors.secondary,
                wireframe: true,
                transparent: true,
                opacity: 0.3 - c * 0.05
            });
            
            const cage = new THREE.Mesh(geometry, material);
            cage.userData = { type: 'cage', index: c };
            
            this.surroundGroup.add(cage);
        }

        // Vertex particles
        const outerGeom = new THREE.IcosahedronGeometry(this.baseScale * (1.5 + (cageCount - 1) * 0.8), complexity);
        const positions = outerGeom.attributes.position.array;
        
        for (let i = 0; i < Math.min(positions.length / 3, count); i++) {
            const geom = new THREE.SphereGeometry(0.06, 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: this.colors.white,
                transparent: true,
                opacity: 0.6
            });
            
            const particle = new THREE.Mesh(geom, mat);
            particle.position.set(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            particle.userData = { type: 'cageVertex', index: i };
            
            this.surroundGroup.add(particle);
        }
        
        outerGeom.dispose();
    }

    createSpiralArms(count, complexity) {
        const arms = 2 + complexity;
        const pointsPerArm = Math.floor(count / arms);
        
        for (let a = 0; a < arms; a++) {
            const armAngle = (a / arms) * Math.PI * 2;
            
            for (let i = 0; i < pointsPerArm; i++) {
                const t = i / pointsPerArm;
                const spiralAngle = armAngle + t * Math.PI * 3;
                const radius = this.baseScale * (1.2 + t * 2);
                const y = (t - 0.5) * this.baseScale * 2;
                
                const size = 0.1 + (1 - t) * 0.15;
                const geom = complexity > 2
                    ? new THREE.OctahedronGeometry(size, 0)
                    : new THREE.SphereGeometry(size, 6, 6);
                
                const mat = new THREE.MeshBasicMaterial({
                    color: this.getGradientColor(t),
                    transparent: true,
                    opacity: 0.7
                });
                
                const particle = new THREE.Mesh(geom, mat);
                particle.position.set(
                    Math.cos(spiralAngle) * radius,
                    y,
                    Math.sin(spiralAngle) * radius
                );
                particle.userData = { type: 'spiral', arm: a, t, spiralAngle, radius, baseY: y };
                
                this.surroundGroup.add(particle);
            }
        }
    }

    createParticleCloud(count, complexity) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            const radius = this.baseScale * (1.5 + Math.random() * 3);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            const color = this.getGradientColor(Math.random());
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.userData.originalPositions = positions.slice();
        
        const material = new THREE.PointsMaterial({
            size: 0.1 + complexity * 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        const points = new THREE.Points(geometry, material);
        points.userData = { type: 'cloud' };
        this.surroundGroup.add(points);
    }

    createConcentricSpheres(count, complexity) {
        for (let i = 0; i < count; i++) {
            const radius = this.baseScale * (1.3 + i * 0.4);
            const detail = complexity + 1;
            
            const geometry = new THREE.IcosahedronGeometry(radius, detail);
            const material = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(i / count),
                wireframe: true,
                transparent: true,
                opacity: 0.2 - i * 0.02
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.userData = { type: 'concentricSphere', index: i };
            
            this.surroundGroup.add(sphere);
        }
    }

    createDNAHelix(count, complexity) {
        const turns = 2 + complexity;
        const radius = this.baseScale * 1.5;
        const height = this.baseScale * 4;
        
        for (let strand = 0; strand < 2; strand++) {
            const strandOffset = strand * Math.PI;
            
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const angle = t * Math.PI * 2 * turns + strandOffset;
                const y = (t - 0.5) * height;
                
                const size = 0.12 + complexity * 0.03;
                const geom = new THREE.SphereGeometry(size, 8, 8);
                const mat = new THREE.MeshBasicMaterial({
                    color: strand === 0 ? this.colors.primary : this.colors.secondary,
                    transparent: true,
                    opacity: 0.8
                });
                
                const node = new THREE.Mesh(geom, mat);
                node.position.set(
                    Math.cos(angle) * radius,
                    y,
                    Math.sin(angle) * radius
                );
                node.userData = { type: 'dnaNode', strand, t, angle, baseY: y };
                
                this.surroundGroup.add(node);
                
                // Connection to other strand
                if (i % 4 === 0 && complexity > 1) {
                    const otherAngle = angle + Math.PI;
                    const lineGeom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
                        new THREE.Vector3(Math.cos(otherAngle) * radius, y, Math.sin(otherAngle) * radius)
                    ]);
                    const lineMat = new THREE.LineBasicMaterial({
                        color: this.colors.white,
                        transparent: true,
                        opacity: 0.3
                    });
                    const line = new THREE.Line(lineGeom, lineMat);
                    line.userData = { type: 'dnaLink' };
                    this.surroundGroup.add(line);
                }
            }
        }
    }

    createAtomicOrbits(count, complexity) {
        const electronCount = count;
        
        // Orbits
        for (let o = 0; o < 3; o++) {
            const radius = this.baseScale * (1.5 + o * 0.6);
            const geometry = new THREE.TorusGeometry(radius, 0.015, 8, 64);
            const material = new THREE.MeshBasicMaterial({
                color: this.colors.white,
                transparent: true,
                opacity: 0.2
            });
            
            const orbit = new THREE.Mesh(geometry, material);
            orbit.rotation.x = (o * Math.PI) / 3;
            orbit.rotation.y = (o * Math.PI) / 4;
            orbit.userData = { type: 'orbit', index: o };
            
            this.surroundGroup.add(orbit);
        }
        
        // Electrons
        for (let e = 0; e < electronCount; e++) {
            const orbitIdx = e % 3;
            const angle = (e / electronCount) * Math.PI * 2;
            const radius = this.baseScale * (1.5 + orbitIdx * 0.6);
            
            const size = 0.15 + complexity * 0.05;
            const geom = complexity > 2
                ? new THREE.IcosahedronGeometry(size, 0)
                : new THREE.SphereGeometry(size, 8, 8);
            
            const mat = new THREE.MeshBasicMaterial({
                color: this.getGradientColor(e / electronCount),
                transparent: true,
                opacity: 0.9
            });
            
            const electron = new THREE.Mesh(geom, mat);
            electron.userData = { type: 'electron', orbitIdx, angle, radius };
            
            this.surroundGroup.add(electron);
        }
    }

    // =====================================================
    // BACKGROUND PARTICLES
    // =====================================================

    createBackgroundParticles() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        const count = 600;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const radius = 20 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.userData.originalPositions = positions.slice();

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.06,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    // =====================================================
    // HELPERS
    // =====================================================

    getGradientColor(t) {
        return this.colors.primary.clone().lerp(this.colors.secondary, t);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    // =====================================================
    // UPDATE
    // =====================================================

    update(audioData) {
        const delta = this.clock.getDelta();
        this.time += delta;

        // Smooth audio
        const s = 0.15;
        this.smoothedAudio.amplitude += (audioData.amplitude - this.smoothedAudio.amplitude) * s;
        this.smoothedAudio.bass += (audioData.bass - this.smoothedAudio.bass) * s;
        this.smoothedAudio.mid += (audioData.mid - this.smoothedAudio.mid) * s;
        this.smoothedAudio.treble += (audioData.treble - this.smoothedAudio.treble) * s;

        const { amplitude, bass, mid, treble } = this.smoothedAudio;

        // Update center
        this.updateCenter(amplitude, bass, mid, delta);

        // Update surround
        this.updateSurround(audioData, delta);

        // Update particles
        this.updateParticles(amplitude, delta);

        // Update lights
        this.mainLight.intensity = 1.5 + amplitude * 2;
        this.accentLight.position.x = Math.sin(this.time * 0.3) * 15;
        this.accentLight.position.y = Math.cos(this.time * 0.2) * 10;

        // Update bloom
        this.bloomPass.strength = 0.5 + amplitude * 0.8;

        // Camera
        this.camera.position.x = Math.sin(this.time * 0.08) * 3;
        this.camera.position.y = Math.cos(this.time * 0.1) * 2;
        this.camera.lookAt(0, 0, 0);

        this.composer.render();
    }

    updateCenter(amplitude, bass, mid, delta) {
        if (!this.centerSolid) return;

        // Scale
        const scale = 1 + bass * 0.4;
        this.centerGroup.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);

        // Rotation
        const rotSpeed = 0.2 + mid * 0.5;
        this.centerGroup.rotation.x += delta * rotSpeed * 0.3;
        this.centerGroup.rotation.y += delta * rotSpeed;

        // Colors
        const hsl = {};
        this.colors.primary.getHSL(hsl);
        this.centerWire.material.color.setHSL(hsl.h, hsl.s, 0.4 + amplitude * 0.4);
        this.centerWire.material.opacity = 0.6 + amplitude * 0.4;
        this.centerSolid.material.emissive.setHSL(hsl.h, 0.5, amplitude * 0.15);
    }

    updateSurround(audioData, delta) {
        const { amplitude, bass, mid, frequencies } = audioData;

        this.surroundGroup.children.forEach((child, idx) => {
            const data = child.userData;
            
            switch (data.type) {
                case 'ring':
                    child.rotation.z += delta * (0.2 + amplitude * 0.3) * (data.index % 2 === 0 ? 1 : -1);
                    child.scale.setScalar(1 + bass * 0.2);
                    break;

                case 'orbitalParticle':
                    const newAngle = data.angle + this.time * (0.5 + data.ringIdx * 0.2);
                    child.position.x = Math.cos(newAngle) * data.radius;
                    child.position.z = Math.sin(newAngle) * data.radius;
                    const freqIdx = Math.floor((idx / this.surroundGroup.children.length) * (frequencies?.length || 64) * 0.5);
                    child.scale.setScalar(1 + (frequencies?.[freqIdx] || 0) * 2);
                    break;

                case 'polyhedron':
                    child.rotation.x += delta * data.rotSpeed * (1 + amplitude);
                    child.rotation.y += delta * data.rotSpeed * 0.7;
                    child.position.y = data.baseY + Math.sin(this.time + data.angle) * 0.5;
                    break;

                case 'cage':
                    child.rotation.x += delta * 0.1 * (data.index % 2 === 0 ? 1 : -1);
                    child.rotation.y += delta * 0.15 * (data.index % 2 === 0 ? -1 : 1);
                    child.scale.setScalar(1 + bass * 0.1);
                    break;

                case 'spiral':
                    const spiralPush = (frequencies?.[Math.floor(data.t * 32)] || 0) * 0.5;
                    const newSpiralAngle = data.spiralAngle + this.time * 0.3;
                    child.position.x = Math.cos(newSpiralAngle) * (data.radius + spiralPush);
                    child.position.z = Math.sin(newSpiralAngle) * (data.radius + spiralPush);
                    break;

                case 'cloud':
                    if (child.geometry.userData.originalPositions) {
                        const positions = child.geometry.attributes.position.array;
                        const original = child.geometry.userData.originalPositions;
                        const count = positions.length / 3;
                        
                        for (let i = 0; i < count; i++) {
                            const i3 = i * 3;
                            const freq = frequencies?.[i % (frequencies.length || 1)] || 0;
                            positions[i3] = original[i3] * (1 + freq * 0.3);
                            positions[i3 + 1] = original[i3 + 1] * (1 + freq * 0.3);
                            positions[i3 + 2] = original[i3 + 2] * (1 + freq * 0.3);
                        }
                        child.geometry.attributes.position.needsUpdate = true;
                    }
                    child.rotation.y += delta * 0.05;
                    break;

                case 'concentricSphere':
                    child.rotation.x += delta * 0.05 * (data.index + 1);
                    child.rotation.y += delta * 0.08 * (data.index + 1);
                    child.scale.setScalar(1 + mid * 0.15);
                    break;

                case 'dnaNode':
                    const dnaAngle = data.angle + this.time * 0.5;
                    child.position.x = Math.cos(dnaAngle) * this.baseScale * 1.5;
                    child.position.z = Math.sin(dnaAngle) * this.baseScale * 1.5;
                    child.scale.setScalar(1 + amplitude * 0.5);
                    break;

                case 'electron':
                    const electronAngle = data.angle + this.time * (1 + data.orbitIdx * 0.5);
                    const orbitRotX = (data.orbitIdx * Math.PI) / 3;
                    const orbitRotY = (data.orbitIdx * Math.PI) / 4;
                    
                    let x = Math.cos(electronAngle) * data.radius;
                    let y = 0;
                    let z = Math.sin(electronAngle) * data.radius;
                    
                    // Apply orbit rotation
                    const cosX = Math.cos(orbitRotX), sinX = Math.sin(orbitRotX);
                    const cosY = Math.cos(orbitRotY), sinY = Math.sin(orbitRotY);
                    
                    let ny = y * cosX - z * sinX;
                    let nz = y * sinX + z * cosX;
                    y = ny; z = nz;
                    
                    let nx = x * cosY + z * sinY;
                    nz = -x * sinY + z * cosY;
                    x = nx; z = nz;
                    
                    child.position.set(x, y, z);
                    child.scale.setScalar(1 + amplitude * 0.8);
                    break;
            }
        });
    }

    updateParticles(amplitude, delta) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const original = this.particles.geometry.userData.originalPositions;

        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            const offset = i * 0.01;
            positions[i3] = original[i3] + Math.sin(this.time * 0.15 + offset) * 0.5;
            positions[i3 + 1] = original[i3 + 1] + Math.cos(this.time * 0.1 + offset) * 0.5;
            positions[i3 + 2] = original[i3 + 2] + Math.sin(this.time * 0.08 + offset * 2) * 0.3;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.material.opacity = 0.3 + amplitude * 0.3;
        this.particles.rotation.y += delta * 0.01;
    }

    // =====================================================
    // API
    // =====================================================

    setGeometry(type) {
        this.settings.geometry = type;
        this.createCenterGeometry();
    }

    setDetail(level) {
        this.settings.detail = level;
        this.createCenterGeometry();
    }

    setSurroundType(type) {
        this.settings.surroundType = type;
        this.createSurroundElements();
    }

    setSurroundCount(count) {
        this.settings.surroundCount = count;
        this.createSurroundElements();
    }

    setSurroundComplexity(complexity) {
        this.settings.surroundComplexity = complexity;
        this.createSurroundElements();
    }

    randomize() {
        const geometries = ['icosahedron', 'octahedron', 'dodecahedron', 'stellatedOcta', 
                           'torusKnot', 'kleinBottle', 'mobiusStrip', 'sierpinski', 'geodesic'];
        const surrounds = ['orbitalRings', 'floatingPolyhedra', 'wireframeCage', 
                          'spiralArms', 'dnaHelix', 'atomicOrbits'];
        
        const newGeom = geometries[Math.floor(Math.random() * geometries.length)];
        const newSurround = surrounds[Math.floor(Math.random() * surrounds.length)];
        const newDetail = Math.floor(Math.random() * 4) + 2;
        
        // Random colors
        const hue1 = Math.random();
        const hue2 = (hue1 + 0.3 + Math.random() * 0.4) % 1;
        this.colors.primary.setHSL(hue1, 0.8, 0.6);
        this.colors.secondary.setHSL(hue2, 0.9, 0.55);

        this.settings.geometry = newGeom;
        this.settings.detail = newDetail;
        this.settings.surroundType = newSurround;
        
        this.createCenterGeometry();
        this.createSurroundElements();

        // Update lights
        this.mainLight.color.copy(this.colors.primary);
        this.accentLight.color.copy(this.colors.secondary);

        return { geometry: newGeom, detail: newDetail, surround: newSurround };
    }

    renderIdle() {
        const delta = this.clock.getDelta();
        this.time += delta;

        const idleData = {
            amplitude: 0.05 + Math.sin(this.time * 0.5) * 0.03,
            bass: 0.04 + Math.sin(this.time * 0.3) * 0.02,
            mid: 0.03 + Math.sin(this.time * 0.4) * 0.02,
            treble: 0.02 + Math.sin(this.time * 0.6) * 0.01,
            frequencies: new Array(64).fill(0).map((_, i) => 
                0.03 + Math.sin(this.time + i * 0.05) * 0.02
            )
        };

        this.update(idleData);
    }

    destroy() {
        window.removeEventListener('resize', () => this.onResize());

        // Cleanup
        [this.centerGroup, this.surroundGroup].forEach(group => {
            if (group) {
                group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });

        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
