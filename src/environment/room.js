import * as THREE from 'three';

/**
 * Room class - Represents a single room in the haunted house
 */
export class Room {
  constructor(id, x, z, width, depth, floor) {
    this.id = id;
    this.position = new THREE.Vector2(x, z);
    this.dimensions = new THREE.Vector2(width, depth);
    this.floor = floor;
    this.doors = [];
    this.windows = [];
    this.furniture = [];
    this.hasCandle = false;
    this.isGhostRoom = false;
  }

  /**
   * Get floor Y position
   */
  getFloorY() {
    return this.floor * 4; // 4 units between floors
  }

  /**
   * Get center position in 3D
   */
  getCenter() {
    return new THREE.Vector3(
      this.position.x + this.dimensions.x / 2,
      this.getFloorY() + 2.5, // Half ceiling height
      this.position.y + this.dimensions.y / 2
    );
  }

  /**
   * Get bounding box for collision detection
   */
  getBoundingBox() {
    const min = new THREE.Vector3(
      this.position.x,
      this.getFloorY(),
      this.position.y
    );
    const max = new THREE.Vector3(
      this.position.x + this.dimensions.x,
      this.getFloorY() + 4, // Full floor height
      this.position.y + this.dimensions.y
    );
    return new THREE.Box3(min, max);
  }

  /**
   * Add a door connection
   */
  addDoor(direction, position) {
    this.doors.push({ direction, position }); // direction: 'north', 'south', 'east', 'west'
  }

  /**
   * Add a window
   */
  addWindow(direction, position) {
    this.windows.push({ direction, position });
  }

  /**
   * Check if point is inside room
   */
  containsPoint(x, z) {
    return (
      x >= this.position.x &&
      x <= this.position.x + this.dimensions.x &&
      z >= this.position.y &&
      z <= this.position.y + this.dimensions.y
    );
  }

  /**
   * Get walls as wall data for rendering
   */
  getWallsData() {
    return {
      position: this.position,
      dimensions: this.dimensions,
      floor: this.floor,
      doors: this.doors,
      windows: this.windows
    };
  }
}

/**
 * Door class - Interactive door between rooms
 */
export class Door {
  constructor(x, z, rotation, isOpen = false) {
    this.position = new THREE.Vector3(x, 2, z);
    this.rotation = rotation;
    this.isOpen = isOpen;
    this.openAngle = 0;
    this.targetAngle = 0;
    this.animating = false;
  }

  /**
   * Create door mesh
   */
  createMesh(material) {
    const geometry = new THREE.BoxGeometry(1, 2.5, 0.1);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.door = this;
    return this.mesh;
  }

  /**
   * Update door animation
   */
  update(deltaTime) {
    if (!this.animating) return;

    const openSpeed = 3;
    if (this.isOpen) {
      this.openAngle = Math.min(this.openAngle + deltaTime * openSpeed, Math.PI / 2);
    } else {
      this.openAngle = Math.max(this.openAngle - deltaTime * openSpeed, 0);
    }

    if (this.mesh) {
      this.mesh.rotation.y = this.rotation + this.openAngle;
    }

    if (Math.abs(this.openAngle - (this.isOpen ? Math.PI / 2 : 0)) < 0.01) {
      this.animating = false;
    }
  }

  /**
   * Toggle open/closed
   */
  toggle() {
    this.isOpen = !this.isOpen;
    this.animating = true;
  }
}

/**
 * Window class - Window with moonlight
 */
export class Window {
  constructor(x, z, rotation) {
    this.position = new THREE.Vector3(x, 2, z);
    this.rotation = rotation;
  }

  /**
   * Create window mesh
   */
  createMesh() {
    const group = new THREE.Group();

    // Frame
    const frameGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1500 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    group.add(frame);

    // Glass pane (transparent)
    const glassGeometry = new THREE.PlaneGeometry(1, 1.3);
    const glassMaterial = new THREE.MeshBasicMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = 0.02;
    group.add(glass);

    group.position.copy(this.position);
    group.rotation.y = this.rotation;

    return group;
  }

  /**
   * Create moonlight effect for window
   */
  createMoonlight(scene) {
    // SpotLight through window
    const light = new THREE.SpotLight(0x4466aa, 5, 15, Math.PI / 6, 0.5);
    light.position.copy(this.position);
    light.position.z += this.rotation === 0 ? 0.5 : this.rotation === Math.PI ? -0.5 : 0;
    light.position.x += this.rotation === Math.PI / 2 ? 0.5 : this.rotation === -Math.PI / 2 ? -0.5 : 0;
    light.target.position.set(this.position.x, 0, this.position.z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    scene.add(light);
    scene.add(light.target);

    return light;
  }
}