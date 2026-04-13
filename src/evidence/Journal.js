import { GhostType, GhostDescriptions, GhostEvidence } from '../ghost/types/GhostTypes.js';

/**
 * Journal UI - Evidence tracking and ghost type filtering
 */
export class Journal {
  constructor(evidenceManager) {
    this.evidenceManager = evidenceManager;
    this.container = null;
    this.isOpen = false;
    
    this.init();
  }
  
  /**
   * Initialize journal UI
   */
  init() {
    this.container = document.createElement('div');
    this.container.id = 'journal';
    this.container.className = 'journal hidden';
    
    this.addStyles();
    this.render();
    
    document.getElementById('app').appendChild(this.container);
    
    // Listen for toggle
    window.addEventListener('toggleJournal', () => this.toggle());
  }
  
  /**
   * Add CSS styles
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .journal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        background: rgba(10, 10, 15, 0.95);
        border: 1px solid #333;
        color: #ccc;
        font-family: 'Courier New', monospace;
        z-index: 200;
        overflow-y: auto;
        padding: 1rem;
      }
      
      .journal.hidden {
        display: none;
      }
      
      .journal h2 {
        color: #8b0000;
        border-bottom: 1px solid #333;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
      }
      
      .journal .evidence-section {
        margin-bottom: 1.5rem;
      }
      
      .journal .evidence-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 1px solid #222;
        margin: 0.25rem 0;
        cursor: pointer;
      }
      
      .journal .evidence-item.collected {
        border-color: #228b22;
        color: #4caf50;
      }
      
      .journal .evidence-checkbox {
        width: 16px;
        height: 16px;
        border: 1px solid #555;
      }
      
      .journal .evidence-item.collected .evidence-checkbox {
        background: #228b22;
      }
      
      .journal .ghost-section {
        margin-top: 1rem;
      }
      
      .journal .ghost-type {
        padding: 0.5rem;
        border: 1px solid #222;
        margin: 0.25rem 0;
      }
      
      .journal .ghost-type.possible {
        border-color: #444;
      }
      
      .journal .ghost-type.ruled-out {
        opacity: 0.3;
        text-decoration: line-through;
      }
      
      .journal .ghost-type.confirmed {
        border-color: #228b22;
        background: rgba(34, 139, 34, 0.2);
      }
      
      .journal .ghost-description {
        font-size: 0.8rem;
        color: #666;
        margin-top: 0.25rem;
      }
      
      .journal .close-hint {
        position: absolute;
        bottom: 0.5rem;
        right: 0.5rem;
        font-size: 0.8rem;
        color: #666;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Render journal content
   */
  render() {
    const collected = this.evidenceManager.getCollectedEvidence();
    const possibleTypes = this.evidenceManager.getPossibleGhostTypes();
    
    this.container.innerHTML = `
      <h2>EVIDENCE JOURNAL</h2>
      
      <div class="evidence-section">
        <h3>Collected Evidence (${collected.length})</h3>
        ${Object.values(['EMF', 'Cold Spot', 'Ghost Orbs', 'Whispers', 'UV Prints', 'Ghost Writing']).map(e => `
          <div class="evidence-item ${collected.includes(e) ? 'collected' : ''}" data-evidence="${e}">
            <div class="evidence-checkbox"></div>
            <span>${e}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="ghost-section">
        <h3>Possible Ghost Types</h3>
        ${Object.values(GhostType).map(type => `
          <div class="ghost-type ${possibleTypes.includes(type) ? 'possible' : 'ruled-out'}" data-ghost="${type}">
            <div>${type}</div>
            <div class="ghost-description">${GhostDescriptions[type]}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="close-hint">Press TAB to close</div>
    `;
    
    // Add click handlers for evidence items
    this.container.querySelectorAll('.evidence-item').forEach(item => {
      item.addEventListener('click', () => {
        const evidence = item.dataset.evidence;
        if (!collected.includes(evidence)) {
          this.evidenceManager.collectEvidence(evidence);
          this.render();
        }
      });
    });
  }
  
  /**
   * Toggle journal visibility
   */
  toggle() {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      this.render();
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }
  
  /**
   * Show journal
   */
  show() {
    this.isOpen = true;
    this.render();
    this.container.classList.remove('hidden');
  }
  
  /**
   * Hide journal
   */
  hide() {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }
}