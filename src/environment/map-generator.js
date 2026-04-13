import * as THREE from 'three';
import { Room, Door, Window } from './room.js';
import { generateWallTexture, generateFloorTexture, generateDoorTexture } from './texture-generator.js';

/**
 * Seeded PRNG (Mulberry32)
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Alea PRNG - combines multiple seeds
 */
function alea(...seeds) {
  let s0 = 0, s1 = 0, s2 = 0, c = 1;
  const mash = data => {
    data = String(data);
    for (let i = 0; i < data.length; i++) {
      s0 ^= mash_128(data.charCodeAt(i));
      s1 ^= mash_128(data.charCodeAt(i));
      s2 ^= mash_128(data.charCodeAt(i));
    }
  };
  const mash_128 = x => {
    x = Math.imul(x, 0x5D6CE79B);
    x ^= x >>> 16;
    x = Math.imul(x + x, 0x5D6CE79B);
    return x;
  };
  for (let i = 0; i < seeds.length; i++) {
    s0 ^= seeds[i] >>> 0;
    s1 ^= seeds[i] >>> 0;
    s2 ^= seeds[i] >>> 0;
  }
  
  return function() {
    s0 = s0 >>> 0; s1 = s1 >>> 0; s2 = s2 >>> 0;
    const t = (s0 + s1 + s2) >>> 0;
    s0 = s0 >>> 0; s1 = s1 >>> 0; s2 = s2 >>> 0;
    s2 = (s2 + 1) >>> 0;
    return ((t + c) / 4294967296) >>> 0;
  };
}

/**
 * MapGenerator - Procedural Victorian house generator
 */
export class MapGenerator {
  constructor(seed = 'spectra') {
    this.seed = seed;
    this.rng = alea(seed.split('').map(c => c.charCodeAt(0)));
    this.floors = [];
    this.rooms = [];
    this.doors = [];
    this.windows = [];
  }

  /**
   * Generate the full house map
   */
  generate() {
    this.floors = [
      { level: 2, name: 'Attic', rooms: [] },      // Attic
      { level: 1, name: 'Ground', rooms: [] },    // Ground floor
      { level: 0, name: 'Basement', rooms: [] }    // Basement
    ];

    // Generate rooms for each floor
    for (let i = 0; i < 3; i++) {
      this.generateFloor(i);
    }

    // Add staircase
    this.addStaircase();

    // Add windows
    this.addWindows();

    return {
      floors: this.floors,
      rooms: this.rooms,
      doors: this.doors,
      windows: this.windows
    };
  }

  /**
   * Generate rooms for a single floor
   */
  generateFloor(floorIndex) {
    const floor = this.floors[floorIndex];
    const numRooms = 4 + Math.floor(this.rng() * 4); // 4-7 rooms
    
    // Room templates for Victorian house
    const roomTemplates = [
      { width: 4, depth: 4, name: 'Bedroom' },
      { width: 5, depth: 4, name: 'Living Room' },
      { width: 4, depth: 5, name: 'Kitchen' },
      { width: 3, depth: 3, name: 'Closet' },
      { width: 4, depth: 3, name: 'Study' },
      { width: 5, depth: 5, name: 'Hall' },
      { width: 6, depth: 4, name: 'Dining Room' }
    ];

    // Generate non-overlapping rooms
    const maxAttempts = 100;
    let attempts = 0;
    
    while (floor.rooms.length < numRooms && attempts < maxAttempts) {
      attempts++;
      
      const template = roomTemplates[Math.floor(this.rng() * roomTemplates.length)];
      const x = Math.floor(this.rng() * 10) * 2;
      const z = Math.floor(this.rng() * 10) * 2;
      
      // Check collision with existing rooms
      let collision = false;
      for (const room of floor.rooms) {
        if (this.boxesOverlap(
          x, z, template.width, template.depth,
          room.position.x, room.position.y, room.dimensions.x, room.dimensions.y
        )) {
          collision = true;
          break;
        }
      }

      if (collision) continue;

      // Create room
      const roomId = `f${floorIndex}_r${floor.rooms.length}`;
      const room = new Room(
        roomId,
        x, z,
        template.width, template.depth,
        floorIndex
      );
      room.name = template.name;
      
      floor.rooms.push(room);
      this.rooms.push(room);
    }

    // Connect rooms with doors
    this.connectRooms(floor.rooms);
  }

  /**
   * Check if two room boxes overlap
   */
  boxesOverlap(x1, z1, w1, d1, x2, z2, w2, d2) {
    const padding = 0.5; // Space between rooms
    return !(
      x1 + w1 + padding <= x2 ||
      x2 + w2 + padding <= x1 ||
      z1 + d1 + padding <= z2 ||
      z2 + d2 + padding <= z1
    );
  }

  /**
   * Connect nearby rooms with doors
   */
  connectRooms(rooms) {
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const r1 = rooms[i];
        const r2 = rooms[j];
        
        // Check if rooms are adjacent
        const adjacent = this.checkAdjacent(r1, r2);
        if (adjacent && this.rng() > 0.4) {
          // Create door between rooms
          const doorPos = this.getDoorPosition(r1, r2, adjacent);
          const door = new Door(doorPos.x, doorPos.z, doorPos.rotation);
          this.doors.push(door);
          
          r1.addDoor(adjacent, { x: doorPos.x, z: doorPos.z });
        }
      }
    }
  }

  /**
   * Check if two rooms are adjacent
   */
  checkAdjacent(r1, r2) {
    // Check each side
    const gap = 0.5;
    
    // North/south adjacency
    if (r1.position.y === r2.position.y + r2.dimensions.y ||
        r2.position.y === r1.position.y + r1.dimensions.y) {
      if (r1.position.x < r2.position.x + r2.dimensions.x &&
          r1.position.x + r1.dimensions.x > r2.position.x) {
        return r1.position.y < r2.position.y ? 'south' : 'north';
      }
    }
    
    // East/west adjacency
    if (r1.position.x === r2.position.x + r2.dimensions.x ||
        r2.position.x === r1.position.x + r1.dimensions.x) {
      if (r1.position.y < r2.position.y + r2.dimensions.y &&
          r1.position.y + r1.dimensions.y > r2.position.y) {
        return r1.position.x < r2.position.x ? 'east' : 'west';
      }
    }
    
    return null;
  }

  /**
   * Get door position between two rooms
   */
  getDoorPosition(r1, r2, direction) {
    let x, z, rotation;
    
    switch (direction) {
      case 'north':
        x = Math.max(r1.position.x, r2.position.x) + 1;
        z = Math.max(r1.position.y, r2.position.y);
        rotation = 0;
        break;
      case 'south':
        x = Math.max(r1.position.x, r2.position.x) + 1;
        z = Math.min(r1.position.y, r2.position.y);
        rotation = 0;
        break;
      case 'east':
        x = Math.max(r1.position.x, r2.position.x);
        z = Math.max(r1.position.y, r2.position.y) + 1;
        rotation = Math.PI / 2;
        break;
      case 'west':
        x = Math.min(r1.position.x, r2.position.x);
        z = Math.max(r1.position.y, r2.position.y) + 1;
        rotation = Math.PI / 2;
        break;
    }
    
    return { x, z, rotation };
  }

  /**
   * Add staircase connecting floors
   */
  addStaircase() {
    const x = 8;
    const z = 8;
    
    // Staircase segments between floors
    for (let i = 0; i < 2; i++) {
      const door = new Door(x, z + i * 4, 0);
      this.doors.push(door);
    }
  }

  /**
   * Add windows to exterior walls
   */
  addWindows() {
    // Add windows to certain rooms (for moonlight)
    for (const room of this.rooms) {
      if (room.position.x < 4 && this.rng() > 0.5) {
        // West wall window
        const win = new Window(room.position.x, room.position.y + room.dimensions.y / 2, -Math.PI / 2);
        this.windows.push(win);
        room.addWindow('west', { x: room.position.x, z: room.position.y + room.dimensions.y / 2 });
      }
      
      if (room.position.x > 12 && this.rng() > 0.5) {
        // East wall window
        const win = new Window(room.position.x + room.dimensions.x, room.position.y + room.dimensions.y / 2, Math.PI / 2);
        this.windows.push(win);
        room.addWindow('east', { x: room.position.x + room.dimensions.x, z: room.position.y + room.dimensions.y / 2 });
      }
    }
  }

  /**
   * Render the map to a Three.js scene
   */
  render(scene) {
    // Generate textures
    const wallTexture = generateWallTexture(512, 512, this.seed);
    const floorTexture = generateFloorTexture(512, 512, this.seed);
    const doorTexture = generateDoorTexture(256, 256, this.seed);

    // Wall material with procedural texture
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    // Floor material
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.1
    });

    // Door material
    const doorMaterial = new THREE.MeshStandardMaterial({
      map: doorTexture,
      roughness: 0.7,
      metalness: 0.2
    });

    // Render rooms
    for (const room of this.rooms) {
      this.renderRoom(scene, room, wallMaterial, floorMaterial);
    }

    // Render doors
    for (const door of this.doors) {
      const mesh = door.createMesh(doorMaterial);
      scene.add(mesh);
    }

    // Render windows
    for (const win of this.windows) {
      const mesh = win.createMesh();
      scene.add(mesh);
    }

    // Add exterior walls
    this.renderExteriorWalls(scene, wallMaterial);
  }

  /**
   * Render a single room
   */
  renderRoom(scene, room, wallMaterial, floorMaterial) {
    const floor = room.floor * 4;
    const { x, z } = room.position;
    const { x: w, y: d } = room.dimensions;
    const height = 4;

    // Floor
    const floorGeom = new THREE.PlaneGeometry(w, d);
    const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(x + w / 2, floor, z + d / 2);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Walls (4 sides)
    // North wall
    const northGeom = new THREE.PlaneGeometry(w, height);
    const northMesh = new THREE.Mesh(northGeom, wallMaterial);
    northMesh.position.set(x + w / 2, floor + height / 2, z);
    northMesh.receiveShadow = true;
    scene.add(northMesh);

    // South wall
    const southMesh = new THREE.Mesh(northGeom, wallMaterial);
    southMesh.position.set(x + w / 2, floor + height / 2, z + d);
    southMesh.rotation.y = Math.PI;
    southMesh.receiveShadow = true;
    scene.add(southMesh);

    // East wall
    const eastGeom = new THREE.PlaneGeometry(d, height);
    const eastMesh = new THREE.Mesh(eastGeom, wallMaterial);
    eastMesh.position.set(x + w, floor + height / 2, z + d / 2);
    eastMesh.rotation.y = -Math.PI / 2;
    eastMesh.receiveShadow = true;
    scene.add(eastMesh);

    // West wall
    const westMesh = new THREE.Mesh(eastGeom, wallMaterial);
    westMesh.position.set(x, floor + height / 2, z + d / 2);
    westMesh.rotation.y = Math.PI / 2;
    westMesh.receiveShadow = true;
    scene.add(westMesh);

    // Ceiling (optional - makes it feel more enclosed)
    const ceilingGeom = new THREE.PlaneGeometry(w, d);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const ceilingMesh = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(x + w / 2, floor + height, z + d / 2);
    scene.add(ceilingMesh);
  }

  /**
   * Render exterior walls
   */
  renderExteriorWalls(scene, wallMaterial) {
    const extWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95
    });

    // Simple exterior boundary
    const size = 30;
    const thickness = 0.5;
    const height = 5;
    const y = 6;

    // North exterior
    const northGeom = new THREE.BoxGeometry(size, height, thickness);
    const northWall = new THREE.Mesh(northGeom, extWallMaterial);
    northWall.position.set(15, y, -1);
    scene.add(northWall);

    // South exterior  
    const southWall = new THREE.Mesh(northGeom, extWallMaterial);
    southWall.position.set(15, y, 31);
    scene.add(southWall);

    // East exterior
    const eastGeom = new THREE.BoxGeometry(thickness, height, size);
    const eastWall = new THREE.Mesh(eastGeom, extWallMaterial);
    eastWall.position.set(31, y, 15);
    scene.add(eastWall);

    // West exterior
    const westWall = new THREE.Mesh(eastGeom, extWallMaterial);
    westWall.position.set(-1, y, 15);
    scene.add(westWall);
  }

  /**
   * Get random room that can be ghost room
   */
  getRandomRoom() {
    return this.rooms[Math.floor(this.rng() * this.rooms.length)];
  }

  /**
   * Get rooms on a specific floor
   */
  getRoomsOnFloor(floorIndex) {
    return this.rooms.filter(r => r.floor === floorIndex);
  }
}