/**
 * Lobby UI - Room creation, joining, and player management
 */

import networkClient from '../network/client.js';

/**
 * Create and manage lobby UI
 */
class LobbyUI {
  constructor() {
    this.container = null;
    this.state = 'menu'; // menu, creating, joining, lobby, ready, playing
    this.roomCode = null;
    this.playerId = null;
    this.players = [];
  }
  
  /**
   * Initialize lobby UI
   */
  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'lobby';
    this.container.className = 'lobby';
    
    // Add styles
    this.addStyles();
    
    // Show initial menu
    this.showMenu();
    
    // Add to DOM
    document.getElementById('app').appendChild(this.container);
    
    // Listen for network events
    this.setupNetworkListeners();
  }
  
  /**
   * Add CSS styles
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .lobby {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.95);
        color: #eee;
        font-family: 'Courier New', monospace;
        z-index: 100;
      }
      
      .lobby.hidden {
        display: none;
      }
      
      .lobby h1 {
        font-size: 3rem;
        color: #8b0000;
        text-shadow: 0 0 20px rgba(139, 0, 0, 0.5);
        margin-bottom: 2rem;
        letter-spacing: 0.5rem;
      }
      
      .lobby h2 {
        font-size: 1.5rem;
        color: #666;
        margin-bottom: 1rem;
      }
      
      .lobby .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .lobby button {
        padding: 1rem 2rem;
        font-size: 1.2rem;
        font-family: inherit;
        background: transparent;
        border: 1px solid #333;
        color: #eee;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 200px;
      }
      
      .lobby button:hover {
        border-color: #8b0000;
        box-shadow: 0 0 10px rgba(139, 0, 0, 0.3);
      }
      
      .lobby .room-code {
        font-size: 3rem;
        font-family: 'Courier New', monospace;
        color: #8b0000;
        letter-spacing: 0.5rem;
        margin: 1rem 0;
      }
      
      .lobby .player-list {
        list-style: none;
        padding: 0;
        margin: 1rem 0;
        min-width: 200px;
      }
      
      .lobby .player-list li {
        padding: 0.5rem 1rem;
        border: 1px solid #333;
        margin: 0.25rem 0;
        display: flex;
        justify-content: space-between;
      }
      
      .lobby .player-list li.ready {
        border-color: #228b22;
      }
      
      .lobby .player-list li.not-ready {
        border-color: #8b0000;
      }
      
      .lobby .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 1rem 0;
      }
      
      .lobby input {
        padding: 0.75rem 1rem;
        font-size: 1.2rem;
        font-family: inherit;
        background: transparent;
        border: 1px solid #333;
        color: #eee;
        text-align: center;
        letter-spacing: 0.3rem;
      }
      
      .lobby input:focus {
        outline: none;
        border-color: #8b0000;
      }
      
      .lobby .status {
        color: #666;
        font-size: 0.9rem;
        margin-top: 1rem;
      }
      
      .lobby .back-button {
        margin-top: 1rem;
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Show main menu
   */
  showMenu() {
    this.state = 'menu';
    this.container.innerHTML = `
      <h1>SPECTRA</h1>
      <div class="menu-buttons">
        <button id="btn-create">Create Room</button>
        <button id="btn-join">Join Room</button>
      </div>
      <p class="status">The dead don't rest here. Neither will you.</p>
    `;
    
    // Ensure container is in DOM
    if (this.container.parentElement !== document.getElementById('app')) {
      const app = document.getElementById('app');
      if (app) app.appendChild(this.container);
    }
    
    // Bind events
    const btnCreate = document.getElementById('btn-create');
    const btnJoin = document.getElementById('btn-join');
    if (btnCreate) btnCreate.addEventListener('click', () => this.createRoom());
    if (btnJoin) btnJoin.addEventListener('click', () => this.showJoinRoom());
  }
  
  /**
   * Show join room input
   */
  showJoinRoom() {
    this.state = 'joining';
    this.container.innerHTML = `
      <h2>Enter Room Code</h2>
      <div class="input-group">
        <input type="text" id="room-code-input" maxlength="6" placeholder="000000">
      </div>
      <button id="btn-join-submit">Join</button>
      <button id="btn-back" class="back-button">Back</button>
    `;
    
    const input = document.getElementById('room-code-input');
    input.focus();
    
    // Auto-uppercase
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
    
    document.getElementById('btn-join-submit').addEventListener('click', () => {
      const code = input.value.trim();
      if (code.length === 6) {
        this.joinRoom(code);
      }
    });
    
    document.getElementById('btn-back').addEventListener('click', () => this.showMenu());
  }
  
  /**
   * Create a room
   */
  async createRoom() {
    this.state = 'creating';
    this.container.innerHTML = `
      <h2>Creating Room...</h2>
    `;
    
    try {
      // Connect to server if not connected
      if (!networkClient.isConnected()) {
        await networkClient.connect();
      }
      
      // Send create room message
      networkClient.send({
        type: 'create_room',
        data: { name: 'Host' }
      });
    } catch (error) {
      console.error('Failed to create room:', error);
      this.showMenu();
    }
  }
  
  /**
   * Join a room
   */
  async joinRoom(code) {
    this.state = 'joining';
    this.container.innerHTML = `
      <h2>Joining Room ${code}...</h2>
    `;
    
    try {
      // Connect to server if not connected
      if (!networkClient.isConnected()) {
        await networkClient.connect();
      }
      
      // Send join room message
      networkClient.send({
        type: 'join_room',
        data: { code, name: 'Player' }
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      this.showMenu();
    }
  }
  
  /**
   * Show lobby with room code
   */
  showLobby(code, playerId) {
    this.state = 'lobby';
    this.roomCode = code;
    this.playerId = playerId;
    
    this.container.innerHTML = `
      <h2>Room</h2>
      <div class="room-code">${code}</div>
      <ul class="player-list" id="player-list"></ul>
      <div class="input-group" id="ready-section">
        <button id="btn-ready">Ready</button>
        <button id="btn-start" disabled>Start Game</button>
      </div>
      <button id="btn-leave" class="back-button">Leave Room</button>
    `;
    
    // Bind events
    document.getElementById('btn-ready').addEventListener('click', () => this.toggleReady());
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-leave').addEventListener('click', () => this.leaveRoom());
  }
  
  /**
   * Update player list
   */
  updatePlayerList(players) {
    this.players = players;
    
    const list = document.getElementById('player-list');
    if (!list) return;
    
    list.innerHTML = players.map(p => `
      <li class="${p.ready ? 'ready' : 'not-ready'}">
        <span>${p.name}${p.isHost ? ' (Host)' : ''}</span>
        <span>${p.ready ? '✓' : '✗'}</span>
      </li>
    `).join('');
    
    // Enable start button if all ready
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      const allReady = players.every(p => p.ready);
      const hasMultiple = players.length >= 1;
      startBtn.disabled = !allReady || !hasMultiple;
    }
  }
  
  /**
   * Toggle ready status
   */
  toggleReady() {
    if (!this.roomCode) return;
    
    const btn = document.getElementById('btn-ready');
    const isReady = btn.textContent === 'Ready';
    
    networkClient.send({
      type: 'ready',
      data: { ready: !isReady }
    });
  }
  
  /**
   * Start the game
   */
  startGame() {
    networkClient.send({
      type: 'start',
      data: {}
    });
  }
  
  /**
   * Leave the room
   */
  leaveRoom() {
    networkClient.send({
      type: 'leave_room',
      data: {}
    });
    
    this.showMenu();
  }
  
  /**
   * Hide lobby
   */
  hide() {
    this.container.classList.add('hidden');
  }
  
  /**
   * Show lobby
   */
  show() {
    this.container.classList.remove('hidden');
  }
  
  /**
   * Setup network event listeners
   */
  setupNetworkListeners() {
    networkClient.on('room_created', (data) => {
      this.showLobby(data.code, data.playerId);
    });
    
    networkClient.on('room_joined', (data) => {
      this.showLobby(data.code, data.playerId);
      if (data.roomState) {
        this.updatePlayerList(data.roomState.players);
      }
    });
    
    networkClient.on('player_joined', (data) => {
      // Update player list
      const roomState = networkClient.roomState;
      if (roomState) {
        this.updatePlayerList(roomState.players);
      }
    });
    
    networkClient.on('player_left', (data) => {
      // Update player list
      const roomState = networkClient.roomState;
      if (roomState) {
        this.updatePlayerList(roomState.players);
      }
    });
    
    networkClient.on('player_ready', (data) => {
      // Update player list from server
    });
    
    networkClient.on('all_ready', (data) => {
      // Can start now
    });
    
    networkClient.on('game_start', (data) => {
      this.hide();
    });
    
    networkClient.on('error', (data) => {
      alert(data.message);
      this.showMenu();
    });
  }
}

// Export singleton
const lobbyUI = new LobbyUI();
export default lobbyUI;