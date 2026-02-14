// popup.js
(function() {
  'use strict';

  const CATEGORY_ICONS = {
    identite: '👤', contact: '📧', financier: '💳', adresse: '📍', technique: '🔧'
  };

  const CATEGORY_LABELS = {
    identite: 'Identité', contact: 'Contact', financier: 'Financier', adresse: 'Adresses', technique: 'Technique'
  };

  async function loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getSessionStats' });
      const stats = response?.stats || { total: 0, art4: 0, art9: 0, categoryCounts: {} };

      document.getElementById('stats-total').textContent = stats.total + ' donnees pseudonymisees';
      document.getElementById('stats-art4').textContent = stats.art4;
      document.getElementById('stats-art9').textContent = stats.art9;

      const listEl = document.getElementById('category-list');
      const counts = stats.categoryCounts || {};
      const entries = Object.entries(counts).filter(([, count]) => count > 0);

      if (entries.length === 0) {
        listEl.innerHTML = '<div class="category-empty">Aucune donnée cette session</div>';
      } else {
        listEl.innerHTML = entries.map(([cat, count]) =>
          '<div class="category-item">' +
            '<span class="category-icon">' + (CATEGORY_ICONS[cat] || '📌') + '</span>' +
            '<span class="category-label">' + (CATEGORY_LABELS[cat] || cat) + '</span>' +
            '<span class="category-count">' + count + '</span>' +
          '</div>'
        ).join('');
      }
    } catch (e) {
      console.error('[PseudoShield] Erreur chargement stats:', e);
    }
  }

  async function loadToggleState() {
    try {
      const result = await chrome.storage.local.get('pseudoshield_enabled');
      const enabled = result.pseudoshield_enabled !== false;
      document.getElementById('toggle-enabled').checked = enabled;
      document.body.classList.toggle('disabled', !enabled);
    } catch (e) {
      console.error('[PseudoShield] Erreur chargement état toggle:', e);
    }
  }

  document.getElementById('toggle-enabled').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    document.body.classList.toggle('disabled', !enabled);
    await chrome.runtime.sendMessage({ type: 'toggle', enabled });
  });

  document.getElementById('btn-table').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (confirm('Réinitialiser les compteurs de session ?')) {
      await chrome.runtime.sendMessage({ type: 'resetSession' });
      loadStats();
    }
  });

  loadToggleState();
  loadStats();
})();
