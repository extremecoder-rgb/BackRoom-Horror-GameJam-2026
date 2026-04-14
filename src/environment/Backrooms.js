import * as THREE from 'three';

export class Backrooms {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.walls = [];
        
        // Load textures
        const loader = new THREE.TextureLoader();
        this.wallpaperTex = loader.load('/wallpaper.png');
        this.wallpaperTex.wrapS = THREE.RepeatWrapping;
        this.wallpaperTex.wrapT = THREE.RepeatWrapping;
        this.wallpaperTex.repeat.set(2, 1);

        this.carpetTex = loader.load('/carpet.png');
        this.carpetTex.wrapS = THREE.RepeatWrapping;
        this.carpetTex.wrapT = THREE.RepeatWrapping;
        this.carpetTex.repeat.set(20, 20);

        this.createWorld();
        scene.add(this.group);
    }

    createWorld() {
        // ─── MATERIALS ───
        // Use StandardMaterial so walls react to light
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: this.carpetTex,
            color: 0xA89F91,
            roughness: 0.9,
            metalness: 0.1
        });

        const ceilMat = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCBB,
            side: THREE.DoubleSide,
            roughness: 0.9
        });

        const wallMat = new THREE.MeshStandardMaterial({ 
            map: this.wallpaperTex,
            color: 0xE1A95F,
            roughness: 0.8
        });

        const wetPatchMat = new THREE.MeshStandardMaterial({
            color: 0x665533,
            roughness: 0.3,
            metalness: 0.1
        });

        // ─── FLOOR ───
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            floorMat
        );
        floor.rotation.x = -Math.PI * 0.5;
        floor.position.y = 0;
        this.group.add(floor);

        // ─── CEILING ───
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            ceilMat
        );
        ceiling.rotation.x = Math.PI * 0.5;
        ceiling.position.y = 3.5;
        this.group.add(ceiling);

        // ─── MAZE GENERATION ───
        const gridSize = 20;
        const cellSize = 8;
        const pillarGeo = new THREE.BoxGeometry(0.8, 3.5, 0.8);
        
        // CLEAR AREAS - make sure key, exit and player locations are open!
        const clearAreas = [
            {x: 8, z: 8},    // Key area
            {x: -32, z: -32}, // Exit area
            {x: 4, z: 4},     // Player start area
            {x: -40, z: -40}  // Ghost start
        ];
        
        const isInClearArea = (px, pz) => {
            return clearArea => Math.abs(px - clearArea.x) < 12 && Math.abs(pz - clearArea.z) < 12;
        };

        for (let x = -gridSize/2; x < gridSize/2; x++) {
            for (let z = -gridSize/2; z < gridSize/2; z++) {
                const px = x * cellSize;
                const pz = z * cellSize;
                
                // Check if this position should be clear (no walls)
                const inClearZone = clearAreas.some(isInClearArea(px, pz));
                
                if (!inClearZone) {
                    // Walls - randomize corridors (reduced density for performance)
                    if (Math.random() > 0.65) this.createWall(px, pz, cellSize, true, wallMat);
                    if (Math.random() > 0.65) this.createWall(px, pz, cellSize, false, wallMat);
                }
                
                // Pillars at intersections (reduced density)
                if (Math.random() > 0.7) {
                    const pillar = new THREE.Mesh(pillarGeo, wallMat);
                    pillar.position.set(px, 1.75, pz);
                    this.group.add(pillar);
                    this.walls.push(pillar);
                }

                // Wet patches on carpet (reduced density)
                if (Math.random() > 0.92) {
                    const patch = new THREE.Mesh(
                        new THREE.PlaneGeometry(2 + Math.random() * 3, 2 + Math.random() * 3),
                        wetPatchMat
                    );
                    patch.rotation.x = -Math.PI * 0.5;
                    patch.position.set(
                        px + (Math.random()-0.5)*cellSize,
                        0.01,
                        pz + (Math.random()-0.5)*cellSize
                    );
                    this.group.add(patch);
                }
                
                // Fluorescent lights - FAR REDUCED: only ~16 lights instead of 200+
                // Place them in a grid pattern for consistent coverage
                if (x % 5 === 0 && z % 5 === 0) {
                    this.createLight(px + cellSize/2, pz + cellSize/2);
                }

                // Red Room anomaly
                if (x === 3 && z === 3) {
                    this.createRedRoom(px, pz, cellSize);
                }
            }
        }

        // Boundary walls
        const bSize = gridSize * cellSize;
        this.createWall(-bSize/2, 0, bSize, true, wallMat);
        this.createWall(bSize/2, 0, bSize, true, wallMat);
        this.createWall(0, -bSize/2, bSize, false, wallMat);
        this.createWall(0, bSize/2, bSize, false, wallMat);

        // Exit signs
        this.createExitSigns(wallMat);
    }

    createWall(x, z, size, horizontal, material) {
        const geo = horizontal 
            ? new THREE.BoxGeometry(size, 3.5, 0.15) 
            : new THREE.BoxGeometry(0.15, 3.5, size);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(x, 1.75, z);
        this.group.add(wall);
        this.walls.push(wall);
    }

    createLight(x, z) {
        // Fluorescent fixture (visible rectangle on ceiling) - ONLY render these
        const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xFFFFF0 });
        const fixture = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.08, 0.4),
            fixtureMat
        );
        fixture.position.set(x, 3.45, z);
        this.group.add(fixture);

        // SKIP individual PointLights - they kill WebGL performance
        // Instead use a single area light for each light cluster
    }

    createRedRoom(px, pz, cellSize) {
        const redMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
        this.createWall(px, pz, cellSize, true, redMat);
        this.createWall(px, pz + cellSize, cellSize, true, redMat);
        this.createWall(px - cellSize/2, pz + cellSize/2, cellSize, false, redMat);
        this.createWall(px + cellSize/2, pz + cellSize/2, cellSize, false, redMat);
        
        // Use only one red point light for performance
        if (!this.redLightAdded) {
            const redLight = new THREE.PointLight(0xff0000, 5, 15);
            redLight.position.set(px, 2.5, pz + cellSize/2);
            this.group.add(redLight);
            this.redLightAdded = true;
        }
    }

    createExitSigns() {
        const signMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
        });
        
        const positions = [
            [24, 2.8, 8], [40, 2.8, -16], [-16, 2.8, 32]
        ];
        positions.forEach(pos => {
            const sign = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 0.5),
                signMat
            );
            sign.position.set(...pos);
            this.group.add(sign);
            
            // Small green glow
            const glow = new THREE.PointLight(0x00ff00, 2, 8);
            glow.position.set(pos[0], pos[1] - 0.5, pos[2]);
            this.group.add(glow);
        });
    }

    getCollisionObjects() {
        return this.walls;
    }
}
