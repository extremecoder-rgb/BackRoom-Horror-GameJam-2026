/**
 * WebSocket client for SPECTRA multiplayer
 */

class NetworkClient {
  constructor() {
    this.ws = null;
    this.url = null;
    this.handlers = new Map();
    this.messageQueue = [];
    this.connected = false;
    this.binaryType = 'arraybuffer';
    
    // Prediction support
    this.predictionBuffer = [];
    this.currentTick = 0;
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(url = 'ws://localhost:3000') {
    this.url = url;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = this.binaryType;
        
        this.ws.onopen = () => {
          this.connected = true;
          console.log('WebSocket connected');
          
          // Send queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.send(msg);
          }
          
          resolve();
        };
        
        this.ws.onclose = (event) => {
          this.connected = false;
          console.log('WebSocket closed:', event.code, event.reason);
          this.emit('disconnect', { code: event.code, reason: event.reason });
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    const data = event.data;
    
    // Check if binary or JSON
    if (data instanceof ArrayBuffer) {
      // Binary position update
      const view = new DataView(data);
      const type = view.getUint8(0);
      
      if (type === 0x01) { // Position update
        const position = {
          tick: view.getUint32(1),
          x: view.getFloat32(5),
          y: view.getFloat32(9),
          z: view.getFloat32(13),
          rotation: view.getFloat32(17)
        };
        this.emit('position', position);
      }
    } else {
      // JSON game event
      try {
        const message = JSON.parse(data);
        this.emit(message.type, message.data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    }
  }
  
  /**
   * Send message to server
   */
  send(message) {
    if (!this.connected || !this.ws) {
      this.messageQueue.push(message);
      return;
    }
    
    if (typeof message === 'string') {
      this.ws.send(message);
    } else {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Send binary position update
   */
  sendPosition(x, y, z, rotation) {
    const buffer = new ArrayBuffer(21);
    const view = new DataView(buffer);
    
    view.setUint8(0, 0x01); // Position update type
    view.setFloat32(1, x);
    view.setFloat32(5, y);
    view.setFloat32(9, z);
    view.setFloat32(13, rotation);
    view.setUint32(17, this.currentTick);
    
    this.ws.send(buffer);
  }
  
  /**
   * Handle input with prediction
   */
  handleInput(input) {
    this.currentTick++;
    const inputData = {
      tick: this.currentTick,
      ...input
    };
    
    // Add to prediction buffer
    this.predictionBuffer.push(inputData);
    
    // Apply prediction immediately (simplified)
    this.applyPrediction(input);
    
    // Send to server
    this.send({
      type: 'input',
      data: inputData
    });
  }
  
  /**
   * Apply client-side prediction
   */
  applyPrediction(input) {
    // Simplified prediction - just move based on input
    // Real implementation would use velocity-based movement
    if (input.dx !== undefined) {
      // This is a placeholder - actual prediction handled in player.js
    }
  }
  
  /**
   * Handle server state reconciliation
   */
  handleServerState(state) {
    // Find and remove acknowledged inputs from buffer
    const serverTick = state.tick;
    this.predictionBuffer = this.predictionBuffer.filter(
      input => input.tick > serverTick
    );
    
    // Replay remaining inputs
    for (const input of this.predictionBuffer) {
      this.applyPrediction(input);
    }
    
    // Emit state for other handlers
    this.emit('game_state', state);
  }
  
  /**
   * Register event handler
   */
  on(event, callback) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(callback);
  }
  
  /**
   * Emit event to handlers
   */
  emit(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const callback of handlers) {
        callback(data);
      }
    }
  }
  
  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
  
  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton
const networkClient = new NetworkClient();
export default networkClient;