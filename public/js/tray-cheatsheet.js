// Get traySizes from tray-config.js (now globally available)
// Tray information with serving calculations
const trayServings = {
  "nuggets tray": {
    Small: { serves: 8, servingNote: "8 pieces per person" },
    Medium: { serves: 15, servingNote: "8 pieces per person" },
    Large: { serves: 25, servingNote: "8 pieces per person" }
  },
  "strip tray": {
    Small: { serves: 8, servingNote: "3 strips per person" },
    Medium: { serves: 15, servingNote: "3 strips per person" },
    Large: { serves: 25, servingNote: "3 strips per person" }
  },
  "cool wrap tray": {
    Small: { serves: 6, servingNote: "1 wrap (2 halves) per person" },
    Medium: { serves: 10, servingNote: "1 wrap (2 halves) per person" },
    Large: { serves: 14, servingNote: "1 wrap (2 halves) per person" }
  },
  "garden salad tray": {
    Small: { serves: 10, servingNote: "2-3 oz portion per person" },
    Large: { serves: 20, servingNote: "2-3 oz portion per person" }
  },
  "chocolate chunk cookie tray": {
    Small: { serves: 12, servingNote: "1 cookie per person" },
    Large: { serves: 24, servingNote: "1 cookie per person" }
  },
  "chocolate fudge brownie tray": {
    Small: { serves: 12, servingNote: "1 brownie per person" },
    Large: { serves: 24, servingNote: "1 brownie per person" }
  },
  "mixed cookie & brownie tray": {
    Small: { serves: 12, servingNote: "1 dessert per person" },
    Large: { serves: 24, servingNote: "1 dessert per person" }
  },
  "mac & cheese tray": {
    Small: { serves: 10, servingNote: "4 oz portion per person" },
    Large: { serves: 20, servingNote: "4 oz portion per person" }
  },
  "chick-n-mini tray": {
    "20": { serves: 10, servingNote: "2 minis per person" },
    "40": { serves: 20, servingNote: "2 minis per person" }
  },
  "fruit tray": {
    Small: { serves: 12, servingNote: "3-4 oz portion per person" },
    Large: { serves: 24, servingNote: "3-4 oz portion per person" }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('cheatsheetToggle');
  const panel = document.getElementById('trayCheatsheet');
  const container = document.getElementById('trayContent');

  // Toggle panel
  toggle.addEventListener('click', () => {
    panel.classList.toggle('active');
    toggle.classList.toggle('active');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== toggle) {
      panel.classList.remove('active');
      toggle.classList.remove('active');
    }
  });

  // Group trays by category
  const categories = {
    'Entrees': ['nuggets tray', 'strip tray', 'cool wrap tray'],
    'Sides': ['garden salad tray', 'mac & cheese tray'],
    'Breakfast': ['chick-n-mini tray'],
    'Desserts': ['chocolate chunk cookie tray', 'chocolate fudge brownie tray', 'mixed cookie & brownie tray'],
    'Fresh': ['fruit tray']
  };

  // Generate content by category
  Object.entries(categories).forEach(([category, trayTypes]) => {
    trayTypes.forEach(trayName => {
      const sizes = traySizes[trayName];
      if (!sizes) return;

      const section = document.createElement('div');
      section.className = 'tray-section collapsed';
      
      section.innerHTML = `
        <h3>
          ${trayName.replace(/^\w/, c => c.toUpperCase())}
          <span class="category-badge">${category}</span>
        </h3>
        <div class="tray-section-content" style="height: 0">
          ${Object.entries(sizes).map(([sizeName, details]) => {
            const servingInfo = trayServings[trayName]?.[sizeName];
            
            return `
              <div class="tray-size">
                <div class="tray-size-header">
                  <strong>${sizeName}</strong>
                </div>
                <div class="tray-details">
                  ${Object.entries(details).map(([key, value]) => `
                    <div class="tray-detail">
                      <span>${key}:</span>
                      <span>${value}</span>
                    </div>
                  `).join('')}
                </div>
                ${servingInfo ? `
                  <div class="serving-info">
                    ✓ Serves ${servingInfo.serves} people
                    <small>${servingInfo.servingNote}</small>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      // Add click handler to toggle section
      const header = section.querySelector('h3');
      const sectionContent = section.querySelector('.tray-section-content');
      header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
        // Animate height
        if (section.classList.contains('collapsed')) {
          sectionContent.style.height = sectionContent.scrollHeight + 'px';
          requestAnimationFrame(() => {
            sectionContent.style.height = '0';
          });
        } else {
          sectionContent.style.height = sectionContent.scrollHeight + 'px';
          sectionContent.addEventListener('transitionend', function handler() {
            sectionContent.style.height = '';
            sectionContent.removeEventListener('transitionend', handler);
          });
        }
      });
      
      container.appendChild(section);
    });
  });
});