import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * BACKROOMS — Professional Level 0
 */
export class Backrooms {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.walls = []; // Actually meshes for raycasting
        this.wallMeshes = [];
        this.floorMeshes = [];
        this.isLoaded = false;
        this.onLoaded = null;
        
        scene.add(this.group);
        this.loadModel();
    }

    async loadModel() {
        const loader = new GLTFLoader();
        
        try {
            console.log('Loading professional Backrooms level model...');
            const gltf = await loader.loadAsync('/backrooms_level_0.glb');
            this.model = gltf.scene;
            
            // Re-center and normalize if needed
            // Most professional models are already correctly sized
            this.group.add(this.model);
            
            // Extract collision data
            this.walls.length = 0;
            this.wallMeshes.length = 0;
            
            // Auto-scale detection
            const worldBox = new THREE.Box3().setFromObject(this.model);
            const worldSize = new THREE.Vector3();
            worldBox.getSize(worldSize);
            console.log('Backrooms Model Size:', worldSize);
            
            // If model is tiny (likely centimeters), scale up
            if (worldSize.x < 10 && worldSize.x > 0) {
                this.model.scale.set(100, 100, 100);
            }

            // Add global base light so the model is visible
            const amb = new THREE.AmbientLight(0xffffee, 0.4);
            this.group.add(amb);
            
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            this.group.add(hemi);
            
            this.model.traverse(child => {
                if (child.isMesh) {
                    child.updateMatrixWorld(true);
                    
                    // Material standardization
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.map) {
                            child.material.map.anisotropy = 8;
                            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                        }
                        
                        // Prevent extreme shiny reflections that look glitchy in corridors
                        child.material.roughness = Math.max(child.material.roughness || 0, 0.6);
                        child.material.metalness = Math.min(child.material.metalness || 0, 0.1);

                        // Light detection
                        const n = child.name.toLowerCase();
                        if (n.includes('light') || n.includes('ceil') || n.includes('fluo')) {
                            const pLight = new THREE.PointLight(0xffffee, 1.2, 15);
                            const worldPos = new THREE.Vector3();
                            child.getWorldPosition(worldPos);
                            pLight.position.copy(worldPos);
                            pLight.position.y -= 0.2;
                            this.group.add(pLight);
                            
                            child.material.emissive = new THREE.Color(0xffffdd);
                            child.material.emissiveIntensity = 1.0;
                        }
                    }

                    const box = new THREE.Box3().setFromObject(child);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    
                    const isFloor = size.y < 0.5 && box.max.y < 0.5;
                    const isCeiling = size.y < 0.5 && box.min.y > 2.5;
                    
                    if (!isFloor && !isCeiling) {
                        this.wallMeshes.push(child);
                        this.walls.push({ mesh: child, box: box });
                    } else if (isFloor) {
                        this.floorMeshes.push(child);
                    }
                }
            });
            
            this.isLoaded = true;
            console.log('✅ Backrooms Loaded. Wall meshes found:', this.wallMeshes.length);
            
            if (this.onLoaded) this.onLoaded();
            
        } catch (error) {
            console.error('❌ Failed to load GLB:', error);
            this.createProceduralFallback();
        }
    }

    createProceduralFallback() {
        const loader = new THREE.TextureLoader();
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xE1A95F, roughness: 0.8 });
        
        // Simple room
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x555544 }));
        floor.rotation.x = -Math.PI * 0.5;
        this.group.add(floor);

        this.createWall(10, 0, 20, false, wallMat);
        this.createWall(-10, 0, 20, false, wallMat);
        this.createWall(0, 10, 20, true, wallMat);
        this.createWall(0, -10, 20, true, wallMat);
        
        this.isLoaded = true;
        if (this.onLoaded) this.onLoaded();
    }

    createWall(x, z, size, horizontal, material) {
        const geo = horizontal 
            ? new THREE.BoxGeometry(size, 3.5, 0.4) 
            : new THREE.BoxGeometry(0.4, 3.5, size);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(x, 1.75, z);
        this.group.add(wall);
        
        const box = new THREE.Box3().setFromObject(wall);
        this.wallMeshes.push(wall);
        this.walls.push({ mesh: wall, box: box });
    }

    getCollisionObjects() {
        return this.walls;
    }

    getWallMeshes() {
        return this.wallMeshes;
    }

    getRandomPosition() {
        if (!this.isLoaded || this.floorMeshes.length === 0) {
            return new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
        }
        
        const raycaster = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);
        
        // Try up to 50 times to find a valid floor position
        for (let i = 0; i < 50; i++) {
            const floor = this.floorMeshes[Math.floor(Math.random() * this.floorMeshes.length)];
            const box = new THREE.Box3().setFromObject(floor);
            
            const x = box.min.x + Math.random() * (box.max.x - box.min.x);
            const z = box.min.z + Math.random() * (box.max.z - box.min.z);
            
            // Raycast down from ceiling height to verify we hit a floor
            const origin = new THREE.Vector3(x, 5.0, z);
            raycaster.set(origin, down);
            
            const intersects = raycaster.intersectObjects(this.floorMeshes);
            if (intersects.length > 0) {
                // We hit a floor! Use the hit point.
                const hit = intersects[0].point;
                
                // Final check: Is it inside a wall?
                const wallRay = new THREE.Raycaster(hit.clone().add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0, 1, 0));
                const wallI = wallRay.intersectObjects(this.wallMeshes);
                
                if (wallI.length === 0) {
                    console.log(`📍 Found valid random spawn: ${Math.round(x)}, ${Math.round(z)}`);
                    return new THREE.Vector3(hit.x, 0, hit.z);
                }
            }
        }
        
        console.warn('⚠️ Could not find verified floor position, using fallback.');
        return new THREE.Vector3(0, 0, 0);
    }
}
