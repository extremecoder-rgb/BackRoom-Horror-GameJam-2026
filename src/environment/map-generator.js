import * as THREE from 'three';
import { Room, Door, Window } from './room.js';
import { generateWallTexture, generateFloorTexture, generateDoorTexture } from './texture-generator.js';

/**
 * Seeded PRNG (Mulberry32)
 */
function seededRandom(seed) {
  let h = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return function() {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * MapGenerator - Creates a proper haunted house with hand-crafted layout
 */
export class MapGenerator {
  constructor(seed = 'spectra') {
    this.seed = seed;
    this.rng = seededRandom(seed);
    this.rooms = [];
    this.doors = [];
    this.windows = [];
    this.furniture = [];
  }

  /**
   * Generate the haunted house with a fixed, well-designed layout
   */
  generate() {
    // Hand-crafted house layout for a proper haunted house experience
    // Ground floor (floor=1, y=4)
    this.rooms.push(new Room('entrance_hall', 8, 0, 6, 4, 1));
    this.rooms[this.rooms.length-1].name = 'Entrance Hall';

    this.rooms.push(new Room('main_hall', 6, 4, 10, 8, 1));
    this.rooms[this.rooms.length-1].name = 'Main Hall';

    this.rooms.push(new Room('living_room', 0, 4, 6, 6, 1));
    this.rooms[this.rooms.length-1].name = 'Living Room';

    this.rooms.push(new Room('kitchen', 0, 10, 6, 6, 1));
    this.rooms[this.rooms.length-1].name = 'Kitchen';

    this.rooms.push(new Room('dining_room', 16, 4, 6, 6, 1));
    this.rooms[this.rooms.length-1].name = 'Dining Room';

    this.rooms.push(new Room('study', 16, 10, 6, 6, 1));
    this.rooms[this.rooms.length-1].name = 'Study';

    this.rooms.push(new Room('corridor', 6, 12, 10, 3, 1));
    this.rooms[this.rooms.length-1].name = 'Back Corridor';

    // Upper floor (floor=2, y=8)
    this.rooms.push(new Room('master_bedroom', 6, 4, 8, 6, 2));
    this.rooms[this.rooms.length-1].name = 'Master Bedroom';

    this.rooms.push(new Room('child_room', 0, 4, 6, 6, 2));
    this.rooms[this.rooms.length-1].name = "Child's Room";

    this.rooms.push(new Room('bathroom', 14, 4, 4, 4, 2));
    this.rooms[this.rooms.length-1].name = 'Bathroom';

    this.rooms.push(new Room('library', 0, 10, 8, 6, 2));
    this.rooms[this.rooms.length-1].name = 'Library';

    this.rooms.push(new Room('attic_stairs', 14, 8, 4, 4, 2));
    this.rooms[this.rooms.length-1].name = 'Attic Stairs';

    this.rooms.push(new Room('upstairs_hall', 6, 10, 8, 3, 2));
    this.rooms[this.rooms.length-1].name = 'Upstairs Hallway';

    // Basement (floor=0, y=0)
    this.rooms.push(new Room('basement_main', 6, 4, 10, 10, 0));
    this.rooms[this.rooms.length-1].name = 'Basement';

    this.rooms.push(new Room('cellar', 0, 4, 6, 6, 0));
    this.rooms[this.rooms.length-1].name = 'Wine Cellar';

    this.rooms.push(new Room('boiler_room', 16, 4, 6, 6, 0));
    this.rooms[this.rooms.length-1].name = 'Boiler Room';

    // Connections (Doors)
    this.addDoorBetween('entrance_hall', 'main_hall', 'south');
    this.addDoorBetween('main_hall', 'living_room', 'west');
    this.addDoorBetween('main_hall', 'dining_room', 'east');
    this.addDoorBetween('living_room', 'kitchen', 'north');
    this.addDoorBetween('dining_room', 'study', 'north');
    this.addDoorBetween('main_hall', 'corridor', 'south');

    return {
      floors: [
        { level: 0, name: 'Basement', rooms: this.rooms.filter(r => r.floor === 0) },
        { level: 1, name: 'Ground', rooms: this.rooms.filter(r => r.floor === 1) },
        { level: 2, name: 'Upper', rooms: this.rooms.filter(r => r.floor === 2) }
      ],
      rooms: this.rooms,
      doors: this.doors,
      windows: this.windows
    };
  }

  /**
   * Add door between two rooms
   */
  addDoorBetween(room1Id, room2Id, dir) {
    const r1 = this.rooms.find(r => r.id === room1Id);
    const r2 = this.rooms.find(r => r.id === room2Id);
    if (!r1 || !r2) return;

    let x, z, rot;
    if (dir === 'south') {
        x = r1.position.x + r1.dimensions.x / 2;
        z = r1.position.y + r1.dimensions.y;
        rot = 0;
    } else if (dir === 'north') {
        x = r1.position.x + r1.dimensions.x / 2;
        z = r1.position.y;
        rot = 0;
    } else if (dir === 'west') {
        x = r1.position.x;
        z = r1.position.y + r1.dimensions.y / 2;
        rot = Math.PI / 2;
    } else if (dir === 'east') {
        x = r1.position.x + r1.dimensions.x;
        z = r1.position.y + r1.dimensions.y / 2;
        rot = Math.PI / 2;
    }

    const door = new Door(x, z, rot);
    this.doors.push(door);
    r1.addDoor(dir, new THREE.Vector2(x, z));
  }

  /**
   * Render the map to a Three.js scene
   */
  render(scene) {
    const wallTexture = generateWallTexture(512, 512, this.seed);
    const floorTexture = generateFloorTexture(512, 512, this.seed);
    const doorTexture = generateDoorTexture(256, 256, this.seed);

    // Warmer wall colors for visibility
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
      color: 0xccbbaa
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
      color: 0x886644
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x998877,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
      map: doorTexture,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      color: 0x553322
    });

    // Render each room
    for (const room of this.rooms) {
      this.renderRoom(scene, room, wallMaterial, floorMaterial, ceilingMaterial);
      this.addFurniture(scene, room);
      this.addHorrorDetails(scene, room);
    }

    // Render doors
    for (const door of this.doors) {
        scene.add(door.createMesh(doorMaterial));
    }

    // Add staircases
    this.renderStaircase(scene, 14, 8, 1, 2); // Ground to Upper
    this.renderStaircase(scene, 14, 8, 0, 1); // Basement to Ground

    // Add ground plane outside house
    const groundGeom = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a15,
      roughness: 1.0
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(11, 0, 8);
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /**
   * Render a single room with walls, floor, ceiling
   */
  renderRoom(scene, room, wallMaterial, floorMaterial, ceilingMaterial) {
    const floorY = room.floor * 4;
    const x = room.position.x;
    const z = room.position.y;
    const w = room.dimensions.x;
    const d = room.dimensions.y;
    const height = 3.5;

    // Floor
    const floorGeom = new THREE.PlaneGeometry(w, d);
    const floorMesh = new THREE.Mesh(floorGeom, floorMaterial.clone());
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(x + w / 2, floorY, z + d / 2);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Ceiling
    const ceilMesh = new THREE.Mesh(floorGeom.clone(), ceilingMaterial.clone());
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(x + w / 2, floorY + height, z + d / 2);
    scene.add(ceilMesh);

    // Walls
    // North wall (z-facing)
    const northGeom = new THREE.PlaneGeometry(w, height);
    const northMesh = new THREE.Mesh(northGeom, wallMaterial.clone());
    northMesh.position.set(x + w / 2, floorY + height / 2, z);
    northMesh.receiveShadow = true;
    scene.add(northMesh);

    // South wall
    const southMesh = new THREE.Mesh(northGeom.clone(), wallMaterial.clone());
    southMesh.position.set(x + w / 2, floorY + height / 2, z + d);
    southMesh.rotation.y = Math.PI;
    southMesh.receiveShadow = true;
    scene.add(southMesh);

    // East wall
    const sideGeom = new THREE.PlaneGeometry(d, height);
    const eastMesh = new THREE.Mesh(sideGeom, wallMaterial.clone());
    eastMesh.position.set(x + w, floorY + height / 2, z + d / 2);
    eastMesh.rotation.y = -Math.PI / 2;
    eastMesh.receiveShadow = true;
    scene.add(eastMesh);

    // West wall
    const westMesh = new THREE.Mesh(sideGeom.clone(), wallMaterial.clone());
    westMesh.position.set(x, floorY + height / 2, z + d / 2);
    westMesh.rotation.y = Math.PI / 2;
    westMesh.receiveShadow = true;
    scene.add(westMesh);

    // Baseboard trim along bottom of walls
    this.addBaseboard(scene, x, floorY, z, w, d);

    // Add a room light (warm pendant) - brighter as requested
    const light = new THREE.PointLight(0xffddaa, 2.0, 15);
    light.position.set(x + w / 2, floorY + height - 0.3, z + d / 2);
    light.castShadow = true;
    scene.add(light);

    // Light fixture visual
    const bulbGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.copy(light.position);
    scene.add(bulb);
  }

  /**
   * Add baseboard trim to room
   */
  addBaseboard(scene, x, floorY, z, w, d) {
    const bbMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
    const bbH = 0.15;
    const bbD = 0.05;

    // North
    const bbN = new THREE.Mesh(new THREE.BoxGeometry(w, bbH, bbD), bbMat);
    bbN.position.set(x + w / 2, floorY + bbH / 2, z + bbD / 2);
    scene.add(bbN);
    // South
    const bbS = new THREE.Mesh(new THREE.BoxGeometry(w, bbH, bbD), bbMat);
    bbS.position.set(x + w / 2, floorY + bbH / 2, z + d - bbD / 2);
    scene.add(bbS);
    // East
    const bbE = new THREE.Mesh(new THREE.BoxGeometry(bbD, bbH, d), bbMat);
    bbE.position.set(x + w - bbD / 2, floorY + bbH / 2, z + d / 2);
    scene.add(bbE);
    // West
    const bbW = new THREE.Mesh(new THREE.BoxGeometry(bbD, bbH, d), bbMat);
    bbW.position.set(x + bbD / 2, floorY + bbH / 2, z + d / 2);
    scene.add(bbW);
  }

  /**
   * Add furniture appropriate to the room type
   */
  addFurniture(scene, room) {
    const floorY = room.floor * 4;
    const x = room.position.x;
    const z = room.position.y;
    const w = room.dimensions.x;
    const d = room.dimensions.y;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.8 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x331508, roughness: 0.85 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x553344, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });

    switch (room.name) {
      case 'Main Hall':
        // Large carpet
        this.addBox(scene, x + w/2, floorY + 0.01, z + d/2, w - 2, 0.02, d - 2, 0x442233);
        // Hall table
        this.addTable(scene, x + w/2, floorY, z + 2, 2, 0.8, 1, woodMat);
        // Candelabra on table
        this.addCandelabra(scene, x + w/2, floorY + 0.85, z + 2);
        break;

      case 'Entrance Hall':
        // Doormat
        this.addBox(scene, x + w/2, floorY + 0.01, z + 1, 2, 0.02, 1, 0x333322);
        // Coat rack
        this.addCoatRack(scene, x + 1, floorY, z + 2);
        break;

      case 'Living Room':
        // Sofa
        this.addSofa(scene, x + w/2, floorY, z + d - 1.5, fabricMat);
        // Coffee table
        this.addTable(scene, x + w/2, floorY, z + d/2, 1.5, 0.45, 0.8, woodMat);
        // Armchair
        this.addArmchair(scene, x + 1.5, floorY, z + d/2, fabricMat);
        // Fireplace
        this.addFireplace(scene, x + w/2, floorY, z + 0.2);
        break;

      case 'Kitchen':
        // Counter along wall
        this.addBox(scene, x + w/2, floorY + 0.45, z + 0.4, w - 1, 0.9, 0.6, 0x555555);
        // Kitchen table
        this.addTable(scene, x + w/2, floorY, z + d/2 + 1, 2, 0.8, 1.2, woodMat);
        // Chairs around table
        this.addChair(scene, x + w/2 - 0.8, floorY, z + d/2, woodMat);
        this.addChair(scene, x + w/2 + 0.8, floorY, z + d/2, woodMat);
        break;

      case 'Dining Room':
        // Long dining table
        this.addTable(scene, x + w/2, floorY, z + d/2, 4, 0.8, 1.5, darkWoodMat);
        // Chairs
        for (let i = 0; i < 3; i++) {
          this.addChair(scene, x + w/2 - 1.5 + i * 1.5, floorY, z + d/2 - 1.2, woodMat);
          this.addChair(scene, x + w/2 - 1.5 + i * 1.5, floorY, z + d/2 + 1.2, woodMat);
        }
        // China cabinet
        this.addBookcase(scene, x + 0.4, floorY, z + d/2, darkWoodMat);
        break;

      case 'Study':
        // Desk
        this.addTable(scene, x + w/2, floorY, z + 2, 2.5, 0.8, 1.2, darkWoodMat);
        // Chair
        this.addChair(scene, x + w/2, floorY, z + 3.2, woodMat);
        // Bookcases
        this.addBookcase(scene, x + 0.4, floorY, z + d/2, darkWoodMat);
        this.addBookcase(scene, x + w - 0.4, floorY, z + d/2, darkWoodMat);
        break;

      case 'Master Bedroom':
        // Bed
        this.addBed(scene, x + w/2, floorY, z + d - 2, fabricMat, woodMat);
        // Nightstands
        this.addTable(scene, x + w/2 - 2, floorY, z + d - 2, 0.5, 0.5, 0.5, woodMat);
        this.addTable(scene, x + w/2 + 2, floorY, z + d - 2, 0.5, 0.5, 0.5, woodMat);
        // Wardrobe
        this.addWardrobe(scene, x + 0.5, floorY, z + 1, darkWoodMat);
        // Vanity mirror
        this.addBox(scene, x + w - 0.6, floorY + 1.2, z + d/2, 0.05, 0.8, 0.6, 0x88aacc);
        break;

      case "Child's Room":
        // Small bed
        this.addBox(scene, x + w/2, floorY + 0.25, z + d - 1, 1.8, 0.5, 0.9, 0x663344);
        // Toy box
        this.addBox(scene, x + 1, floorY + 0.2, z + 1, 0.6, 0.4, 0.4, 0x885522);
        // Small chair
        this.addChair(scene, x + w/2, floorY, z + 2, woodMat);
        break;

      case 'Bathroom':
        // Bathtub
        this.addBathtub(scene, x + w/2, floorY, z + 1);
        // Sink
        this.addBox(scene, x + 0.4, floorY + 0.8, z + d - 1, 0.6, 0.1, 0.4, 0xcccccc);
        // Mirror above sink
        this.addBox(scene, x + 0.1, floorY + 1.5, z + d - 1, 0.05, 0.6, 0.5, 0x88aacc);
        break;

      case 'Library':
        // Many bookcases
        for (let i = 0; i < 3; i++) {
          this.addBookcase(scene, x + 0.4, floorY, z + 1.5 + i * 2, darkWoodMat);
          this.addBookcase(scene, x + w - 0.4, floorY, z + 1.5 + i * 2, darkWoodMat);
        }
        // Reading desk
        this.addTable(scene, x + w/2, floorY, z + d/2, 1.5, 0.8, 1, darkWoodMat);
        break;

      case 'Basement':
        // Storage crates
        this.addBox(scene, x + 2, floorY + 0.3, z + 2, 1, 0.6, 0.8, 0x554422);
        this.addBox(scene, x + 2, floorY + 0.9, z + 2, 0.8, 0.6, 0.6, 0x554422);
        this.addBox(scene, x + w - 2, floorY + 0.3, z + d - 2, 1.2, 0.6, 1, 0x554422);
        // Old workbench
        this.addTable(scene, x + w/2, floorY, z + d/2, 3, 0.8, 1, woodMat);
        break;

      case 'Wine Cellar':
        // Wine racks
        this.addBookcase(scene, x + 0.4, floorY, z + 2, darkWoodMat);
        this.addBookcase(scene, x + 0.4, floorY, z + 4, darkWoodMat);
        // Barrel
        this.addBarrel(scene, x + w - 1.5, floorY, z + d/2);
        break;

      case 'Boiler Room':
        // Boiler (large box)
        this.addBox(scene, x + w/2, floorY + 1, z + d/2, 2, 2, 1.5, 0x444444);
        // Pipes
        this.addBox(scene, x + w/2, floorY + 2.5, z + d/2, 0.1, 1, 0.1, 0x666666);
        break;
    }
  }

  // === Furniture Helpers ===

  addBox(scene, x, y, z, w, h, d, color) {
    const mat = typeof color === 'number'
      ? new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
      : color;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  addTable(scene, x, y, z, w, h, d, mat) {
    // Tabletop
    this.addBox(scene, x, y + h, z, w, 0.06, d, mat);
    // Legs
    const legW = 0.06;
    const legH = h;
    const legMat = mat;
    this.addBox(scene, x - w/2 + 0.1, y + legH/2, z - d/2 + 0.1, legW, legH, legW, legMat);
    this.addBox(scene, x + w/2 - 0.1, y + legH/2, z - d/2 + 0.1, legW, legH, legW, legMat);
    this.addBox(scene, x - w/2 + 0.1, y + legH/2, z + d/2 - 0.1, legW, legH, legW, legMat);
    this.addBox(scene, x + w/2 - 0.1, y + legH/2, z + d/2 - 0.1, legW, legH, legW, legMat);
  }

  addChair(scene, x, y, z, mat) {
    // Seat
    this.addBox(scene, x, y + 0.45, z, 0.45, 0.05, 0.45, mat);
    // Back
    this.addBox(scene, x, y + 0.75, z - 0.2, 0.45, 0.55, 0.05, mat);
    // Legs
    const lw = 0.04;
    this.addBox(scene, x - 0.18, y + 0.22, z - 0.18, lw, 0.44, lw, mat);
    this.addBox(scene, x + 0.18, y + 0.22, z - 0.18, lw, 0.44, lw, mat);
    this.addBox(scene, x - 0.18, y + 0.22, z + 0.18, lw, 0.44, lw, mat);
    this.addBox(scene, x + 0.18, y + 0.22, z + 0.18, lw, 0.44, lw, mat);
  }

  addSofa(scene, x, y, z, mat) {
    // Seat
    this.addBox(scene, x, y + 0.35, z, 2.5, 0.3, 0.9, mat);
    // Backrest
    this.addBox(scene, x, y + 0.7, z + 0.35, 2.5, 0.4, 0.2, mat);
    // Arms
    this.addBox(scene, x - 1.15, y + 0.5, z, 0.2, 0.6, 0.9, mat);
    this.addBox(scene, x + 1.15, y + 0.5, z, 0.2, 0.6, 0.9, mat);
  }

  addArmchair(scene, x, y, z, mat) {
    this.addBox(scene, x, y + 0.3, z, 0.9, 0.3, 0.8, mat);
    this.addBox(scene, x, y + 0.65, z + 0.3, 0.9, 0.4, 0.2, mat);
    this.addBox(scene, x - 0.4, y + 0.45, z, 0.1, 0.5, 0.8, mat);
    this.addBox(scene, x + 0.4, y + 0.45, z, 0.1, 0.5, 0.8, mat);
  }

  addBookcase(scene, x, y, z, mat) {
    // Frame
    this.addBox(scene, x, y + 1.2, z, 0.4, 2.4, 1.2, mat);
    // Shelves
    for (let i = 0; i < 4; i++) {
      this.addBox(scene, x, y + 0.3 + i * 0.6, z, 0.38, 0.03, 1.18, mat);
    }
    // Random books
    const bookColors = [0x882222, 0x228822, 0x222288, 0x886622, 0x228866, 0x662288, 0x884444];
    for (let shelf = 0; shelf < 3; shelf++) {
      const numBooks = 3 + Math.floor(this.rng() * 4);
      for (let b = 0; b < numBooks; b++) {
        const bh = 0.2 + this.rng() * 0.15;
        const bw = 0.05 + this.rng() * 0.04;
        const color = bookColors[Math.floor(this.rng() * bookColors.length)];
        this.addBox(scene, x, y + 0.33 + shelf * 0.6 + bh/2, z - 0.4 + b * 0.16, bw, bh, 0.12, color);
      }
    }
  }

  addBed(scene, x, y, z, fabricMat, woodMat) {
    // Frame
    this.addBox(scene, x, y + 0.25, z, 2, 0.5, 1.5, woodMat);
    // Mattress
    this.addBox(scene, x, y + 0.55, z, 1.9, 0.15, 1.4, 0xeeeecc);
    // Pillow
    this.addBox(scene, x - 0.4, y + 0.7, z - 0.5, 0.5, 0.1, 0.3, 0xeeeeee);
    this.addBox(scene, x + 0.4, y + 0.7, z - 0.5, 0.5, 0.1, 0.3, 0xeeeeee);
    // Blanket
    this.addBox(scene, x, y + 0.68, z + 0.2, 1.8, 0.05, 0.8, fabricMat);
    // Headboard
    this.addBox(scene, x, y + 0.9, z - 0.7, 2, 0.8, 0.08, woodMat);
  }

  addWardrobe(scene, x, y, z, mat) {
    this.addBox(scene, x, y + 1.1, z, 1.2, 2.2, 0.6, mat);
    // Door lines
    this.addBox(scene, x, y + 1.1, z - 0.31, 0.02, 2.0, 0.02, 0x221100);
    // Handle
    this.addBox(scene, x - 0.15, y + 1.1, z - 0.32, 0.03, 0.12, 0.03, 0x888888);
    this.addBox(scene, x + 0.15, y + 1.1, z - 0.32, 0.03, 0.12, 0.03, 0x888888);
  }

  addBathtub(scene, x, y, z) {
    const tubMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3 });
    // Main tub body
    this.addBox(scene, x, y + 0.35, z, 1.8, 0.7, 0.8, tubMat);
    // Interior (darker to look hollow)
    this.addBox(scene, x, y + 0.5, z, 1.6, 0.5, 0.6, 0x999999);
    // Feet
    const footMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
    this.addBox(scene, x - 0.7, y + 0.1, z - 0.3, 0.12, 0.2, 0.12, footMat);
    this.addBox(scene, x + 0.7, y + 0.1, z - 0.3, 0.12, 0.2, 0.12, footMat);
    this.addBox(scene, x - 0.7, y + 0.1, z + 0.3, 0.12, 0.2, 0.12, footMat);
    this.addBox(scene, x + 0.7, y + 0.1, z + 0.3, 0.12, 0.2, 0.12, footMat);
  }

  addBarrel(scene, x, y, z) {
    const barrelGeom = new THREE.CylinderGeometry(0.4, 0.35, 0.9, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.position.set(x, y + 0.45, z);
    barrel.castShadow = true;
    scene.add(barrel);
    // Metal bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.015, 4, 12),
        bandMat
      );
      band.position.set(x, y + 0.15 + i * 0.3, z);
      band.rotation.x = Math.PI / 2;
      scene.add(band);
    }
  }

  addFireplace(scene, x, y, z) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95 });
    // Surround
    this.addBox(scene, x, y + 0.8, z, 2, 1.6, 0.5, stoneMat);
    // Opening
    this.addBox(scene, x, y + 0.5, z + 0.1, 1.2, 1.0, 0.3, 0x111111);
    // Mantle
    this.addBox(scene, x, y + 1.65, z, 2.4, 0.1, 0.6, stoneMat);
    // Warm glow from fire
    const fireLight = new THREE.PointLight(0xff6622, 1.5, 8);
    fireLight.position.set(x, y + 0.3, z + 0.3);
    scene.add(fireLight);
  }

  addCandelabra(scene, x, y, z) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888866, metalness: 0.7 });
    // Base
    this.addBox(scene, x, y + 0.02, z, 0.15, 0.04, 0.15, metalMat);
    // Center stem
    this.addBox(scene, x, y + 0.15, z, 0.03, 0.26, 0.03, metalMat);
    // Candle
    this.addBox(scene, x, y + 0.35, z, 0.05, 0.12, 0.05, 0xeeeedd);
    // Flame light
    const candleLight = new THREE.PointLight(0xffaa44, 0.6, 5);
    candleLight.position.set(x, y + 0.45, z);
    scene.add(candleLight);
  }

  addCoatRack(scene, x, y, z) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.8 });
    // Pole
    this.addBox(scene, x, y + 0.9, z, 0.05, 1.8, 0.05, woodMat);
    // Base
    this.addBox(scene, x, y + 0.03, z, 0.4, 0.06, 0.4, woodMat);
    // Hooks
    this.addBox(scene, x - 0.12, y + 1.6, z, 0.08, 0.03, 0.03, 0x666666);
    this.addBox(scene, x + 0.12, y + 1.6, z, 0.08, 0.03, 0.03, 0x666666);
  }

  /**
   * Add horror details to a room (blood, cobwebs, scratches)
   */
  addHorrorDetails(scene, room) {
    const floorY = room.floor * 4;
    const x = room.position.x;
    const z = room.position.y;
    const w = room.dimensions.x;
    const d = room.dimensions.y;

    // 40% chance of blood stain on floor
    if (this.rng() < 0.4) {
      const stainSize = 0.5 + this.rng() * 2;
      const stainGeom = new THREE.CircleGeometry(stainSize / 2, 12);
      const stainMat = new THREE.MeshStandardMaterial({
        color: 0x440000,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1
      });
      const stain = new THREE.Mesh(stainGeom, stainMat);
      stain.rotation.x = -Math.PI / 2;
      stain.position.set(
        x + 1 + this.rng() * (w - 2),
        floorY + 0.01,
        z + 1 + this.rng() * (d - 2)
      );
      scene.add(stain);
    }

    // 30% chance of cobweb in ceiling corner
    if (this.rng() < 0.3) {
      const webMat = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const webGeom = new THREE.PlaneGeometry(1.5, 1.5);
      const web = new THREE.Mesh(webGeom, webMat);
      web.position.set(x + 0.5, floorY + 3.2, z + 0.5);
      web.rotation.set(-0.3, 0.8, 0);
      scene.add(web);
    }

    // 20% chance of scratch marks on wall
    if (this.rng() < 0.2) {
      const scratchMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1
      });
      for (let i = 0; i < 3; i++) {
        const scratch = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.8), scratchMat);
        scratch.position.set(
          x + 0.05,
          floorY + 1.5 + this.rng() * 0.5,
          z + d/2 - 0.3 + i * 0.15
        );
        scratch.rotation.y = Math.PI / 2;
        scratch.rotation.z = (this.rng() - 0.5) * 0.3;
        scene.add(scratch);
      }
    }
  }

  /**
   * Render staircase between two floors
   */
  renderStaircase(scene, x, z, fromFloor, toFloor) {
    const startY = fromFloor * 4;
    const endY = toFloor * 4;
    const steps = 10;
    const stepH = (endY - startY) / steps;
    const stepD = 0.35;
    const stepW = 1.5;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.8 });

    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, 0.1, stepD),
        woodMat
      );
      step.position.set(x, startY + i * stepH + stepH/2, z + i * stepD);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    // Railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    for (let i = 0; i < steps; i += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), railMat);
      post.position.set(x - stepW/2, startY + i * stepH + 0.4, z + i * stepD);
      scene.add(post);
    }
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