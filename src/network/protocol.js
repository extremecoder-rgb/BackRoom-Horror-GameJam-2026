/**
 * Network Protocol - Message serialization for binary and JSON messages
 */

// Binary message types
export const MessageType = {
  POSITION: 0x01,
  INPUT: 0x02
};

/**
 * Serialize position update to binary
 */
export function serializePosition(x, y, z, rotation) {
  const buffer = new ArrayBuffer(21);
  const view = new DataView(buffer);
  
  view.setUint8(0, MessageType.POSITION); // Message type
  view.setFloat32(1, x);                   // X position
  view.setFloat32(5, y);                   // Y position  
  view.setFloat32(9, z);                   // Z position
  view.setFloat32(13, rotation);          // Y rotation
  view.setUint32(17, Date.now());         // Timestamp
  
  return buffer;
}

/**
 * Deserialize position update from binary
 */
export function deserializePosition(buffer) {
  const view = new DataView(buffer);
  
  if (view.getUint8(0) !== MessageType.POSITION) {
    return null;
  }
  
  return {
    x: view.getFloat32(1),
    y: view.getFloat32(5),
    z: view.getFloat32(9),
    rotation: view.getFloat32(13),
    timestamp: view.getUint32(17)
  };
}

/**
 * Serialize input to binary
 */
export function serializeInput(type, dx, dy, dz, dt) {
  const buffer = new ArrayBuffer(17);
  const view = new DataView(buffer);
  
  view.setUint8(0, MessageType.INPUT);
  view.setUint8(1, type);         // Input type (0=none, 1=move, 2=jump)
  view.setFloat32(2, dx);        // X delta
  view.setFloat32(6, dy);        // Y delta
  view.setFloat32(10, dz);       // Z delta
  view.setFloat32(14, dt);       // Delta time
  
  return buffer;
}

/**
 * Deserialize input from binary
 */
export function deserializeInput(buffer) {
  const view = new DataView(buffer);
  
  if (view.getUint8(0) !== MessageType.INPUT) {
    return null;
  }
  
  return {
    type: view.getUint8(1),
    dx: view.getFloat32(2),
    dy: view.getFloat32(6),
    dz: view.getFloat32(10),
    dt: view.getFloat32(14)
  };
}

/**
 * Serialize game event to JSON
 */
export function serializeGameEvent(type, data) {
  return JSON.stringify({ type, data });
}

/**
 * Deserialize game event from JSON
 */
export function deserializeGameEvent(json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

// Message type constants for JSON events
export const GameEventType = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  READY: 'ready',
  START: 'start',
  CHAT: 'chat',
  POSITION: 'position',
  ERROR: 'error',
  // Server -> Client
  WELCOME: 'welcome',
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_READY: 'player_ready',
  ALL_READY: 'all_ready',
  GAME_START: 'game_start',
  GAME_STATE: 'game_state',
  CHAT: 'chat'
};