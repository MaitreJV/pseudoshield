// options.js
(function() {
  'use strict';

  // Navigation par onglets
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
  }

  // Onglet 1 : Table de correspondance
  async function loadCorrespondenceTable() {
    const result = await chrome.storage.local.get(['anonymizator_table']);
    const table = result.anonymizator_table || {};
    const entries = Object.entries(table);
    const tbody = document.getElementById('correspondence-tbody');
    const searchInput = document.getElementById('correspondence-search');

    function render(filter = '') {
      const filtered = entries.filter(([hash, data]) =>
        !filter || data.pseudonym.toLowerCase().includes(filter.toLowerCase()) ||
        data.category.toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucune donnée</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(([hash, data]) =>
        '<tr>' +
          '<td><strong>' + escapeHtml(data.pseudonym) + '</strong></td>' +
          '<td>' + escapeHtml(data.category) + '</td>' +
          '<td><span class="badge-small badge-' + escapeHtml(data.rgpdCategory) + '">' + escapeHtml(data.rgpdCategory) + '</span></td>' +
          '<td>' + escapeHtml(new Date(data.firstSeen).toLocaleDateString('fr-BE')) + '</td>' +
          '<td>' + escapeHtml(String(data.count)) + '</td>' +
          '<td><button class="btn-reveal" data-pseudonym="' + escapeHtml(data.pseudonym) + '" disabled title="Original non disponible (session expirée)">Révéler</button></td>' +
        '</tr>'
      ).join('');
    }

    searchInput.addEventListener('input', (e) => render(e.target.value));
    render();
  }

  // Onglet 2 : Configuration des patterns
  async function loadPatternConfig() {
    const result = await chrome.storage.local.get('anonymizator_disabled_patterns');
    const disabledPatterns = result.anonymizator_disabled_patterns || [];
    const container = document.getElementById('patterns-container');

    // Définition des patterns pour la page d'options
    const PATTERNS = [
      { id: 'NISS_BE', label: 'Registre national belge', category: 'identite', rgpdCategory: 'art9', confidence: 'high' },
      { id: 'IBAN_BE', label: 'IBAN belge', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_FR', label: 'IBAN français', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_LU', label: 'IBAN luxembourgeois', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_DE', label: 'IBAN allemand', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_NL', label: 'IBAN néerlandais', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_IT', label: 'IBAN italien', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IBAN_ES', label: 'IBAN espagnol', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TVA_BE', label: 'TVA belge', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TVA_FR', label: 'TVA française', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TVA_LU', label: 'TVA luxembourgeoise', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'ADRESSE_EU', label: 'Adresse postale EU', category: 'adresse', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'CI_BE', label: 'Carte identité belge', category: 'identite', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'BCE_BE', label: 'BCE', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'PLAQUE_BE', label: 'Plaque immatriculation belge', category: 'identite', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'EMAIL', label: 'Adresse email', category: 'contact', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TEL_BE', label: 'Téléphone belge', category: 'contact', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TEL_BE_LOCAL', label: 'Téléphone belge (local)', category: 'contact', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TEL_FR', label: 'Téléphone français', category: 'contact', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'TEL_INT', label: 'Téléphone international', category: 'contact', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'DATE_NAISSANCE', label: 'Date de naissance', category: 'identite', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'IPV4', label: 'Adresse IPv4', category: 'technique', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'IPV6', label: 'Adresse IPv6', category: 'technique', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'CB', label: 'Carte bancaire', category: 'financier', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'NOM_CIVILITE', label: 'Nom propre (civilité)', category: 'identite', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'NOM_CONTEXTE', label: 'Nom propre (contexte)', category: 'identite', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'SECU_FR', label: 'Sécurité sociale FR', category: 'identite', rgpdCategory: 'art9', confidence: 'high' }
    ];

    const categories = { identite: 'Identité', contact: 'Contact', financier: 'Financier', adresse: 'Adresse', technique: 'Technique' };
    const confidenceIcons = { high: '🟢', medium: '🟡', low: '🔴' };

    let html = '';
    for (const [catKey, catLabel] of Object.entries(categories)) {
      const catPatterns = PATTERNS.filter(p => p.category === catKey);
      if (catPatterns.length === 0) continue;

      html += '<div class="pattern-group"><div class="pattern-group-title">' + catLabel + '</div>';
      for (const p of catPatterns) {
        const checked = !disabledPatterns.includes(p.id) ? 'checked' : '';
        html += '<div class="pattern-item">' +
          '<label class="toggle-switch toggle-small"><input type="checkbox" data-pattern-id="' + p.id + '" ' + checked + '><span class="toggle-slider"></span></label>' +
          '<span class="pattern-label">' + p.label + '</span>' +
          '<span class="pattern-id">' + p.id + '</span>' +
          '<span class="pattern-confidence">' + confidenceIcons[p.confidence] + '</span>' +
          '<span class="badge-small badge-' + p.rgpdCategory + '">' + p.rgpdCategory + '</span>' +
        '</div>';
      }
      html += '</div>';
    }

    container.innerHTML = html;

    // Écoute des changements de toggle
    container.addEventListener('change', async (e) => {
      if (e.target.dataset.patternId) {
        const result = await chrome.storage.local.get('anonymizator_disabled_patterns');
        const disabled = result.anonymizator_disabled_patterns || [];
        const id = e.target.dataset.patternId;

        if (e.target.checked) {
          const idx = disabled.indexOf(id);
          if (idx > -1) disabled.splice(idx, 1);
        } else {
          if (!disabled.includes(id)) disabled.push(id);
        }

        await chrome.storage.local.set({ anonymizator_disabled_patterns: disabled });
      }
    });
  }

  // Onglet 3 : Whitelist des sites
  async function loadSites() {
    const result = await chrome.storage.local.get(['anonymizator_whitelist', 'anonymizator_allSites']);
    const whitelist = result.anonymizator_whitelist || ['claude.ai', 'chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com', 'chat.deepseek.com', 'perplexity.ai'];
    const allSites = result.anonymizator_allSites || false;

    document.getElementById('all-sites-toggle').checked = allSites;

    function renderSites() {
      const listEl = document.getElementById('sites-list');
      if (whitelist.length === 0) {
        listEl.innerHTML = '<div class="sites-empty">Aucun site configuré</div>';
        return;
      }
      listEl.innerHTML = whitelist.map((domain, i) =>
        '<div class="site-item">' +
          '<span class="site-domain">' + escapeHtml(domain) + '</span>' +
          '<button class="btn-remove" data-index="' + i + '" title="Supprimer ce domaine">&#10005;</button>' +
        '</div>'
      ).join('');
    }

    renderSites();

    document.getElementById('sites-list').addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-remove')) {
        const idx = parseInt(e.target.dataset.index);
        whitelist.splice(idx, 1);
        await chrome.storage.local.set({ anonymizator_whitelist: whitelist });
        renderSites();
      }
    });

    document.getElementById('add-site-btn').addEventListener('click', async () => {
      const input = document.getElementById('add-site-input');
      const domain = input.value.trim().toLowerCase();
      if (domain && !whitelist.includes(domain)) {
        whitelist.push(domain);
        await chrome.storage.local.set({ anonymizator_whitelist: whitelist });
        input.value = '';
        renderSites();
      }
    });

    // Permettre l'ajout avec la touche Entrée
    document.getElementById('add-site-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('add-site-btn').click();
      }
    });

    document.getElementById('all-sites-toggle').addEventListener('change', async (e) => {
      await chrome.storage.local.set({ anonymizator_allSites: e.target.checked });
    });
  }

  // Onglet 4 : Journal RGPD
  async function loadJournal() {
    const result = await chrome.storage.local.get('anonymizator_journal');
    const journal = result.anonymizator_journal || [];
    const tbody = document.getElementById('journal-tbody');

    function render(entries) {
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucune entrée</td></tr>';
        return;
      }

      tbody.innerHTML = [...entries].reverse().map(e =>
        '<tr>' +
          '<td>' + escapeHtml(new Date(e.timestamp).toLocaleString('fr-BE')) + '</td>' +
          '<td class="url-cell" title="' + escapeHtml(e.url) + '">' + escapeHtml(e.url) + '</td>' +
          '<td>' + escapeHtml(String(e.replacementsCount)) + '</td>' +
          '<td>' + escapeHtml(String(e.categoriesAffected?.art4 || 0)) + '</td>' +
          '<td>' + escapeHtml(String(e.categoriesAffected?.art9 || 0)) + '</td>' +
          '<td class="patterns-cell">' + escapeHtml(e.patternsTriggered.join(', ')) + '</td>' +
        '</tr>'
      ).join('');
    }

    render([...journal]);

    // Filtres
    document.getElementById('journal-filter-btn').addEventListener('click', () => {
      const siteFilter = document.getElementById('journal-site-filter').value.trim().toLowerCase();
      const dateFrom = document.getElementById('journal-date-from').value;
      const dateTo = document.getElementById('journal-date-to').value;

      const filtered = journal.filter(e => {
        if (siteFilter && !e.url.toLowerCase().includes(siteFilter)) return false;
        if (dateFrom && e.timestamp < dateFrom) return false;
        if (dateTo && e.timestamp > dateTo + 'T23:59:59') return false;
        return true;
      });

      render([...filtered]);
    });

    // Export CSV
    document.getElementById('journal-export-csv').addEventListener('click', () => {
      const headers = ['Timestamp', 'URL', 'Remplacements', 'Art.4', 'Art.9', 'Patterns'];
      const rows = journal.map(e => [
        e.timestamp, e.url, e.replacementsCount,
        e.categoriesAffected?.art4 || 0, e.categoriesAffected?.art9 || 0,
        e.patternsTriggered.join('; ')
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      downloadFile('anonymizator-journal.csv', csv, 'text/csv');
    });

    // Export JSON
    document.getElementById('journal-export-json').addEventListener('click', () => {
      downloadFile('anonymizator-journal.json', JSON.stringify(journal, null, 2), 'application/json');
    });

    // Purge
    document.getElementById('journal-purge').addEventListener('click', async () => {
      if (confirm('Supprimer définitivement tout le journal RGPD ?')) {
        await chrome.storage.local.remove('anonymizator_journal');
        render([]);
      }
    });
  }

  // Utilitaire de téléchargement de fichier
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export CSV de la table de correspondance
  document.getElementById('correspondence-export-csv')?.addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['anonymizator_table']);
    const table = result.anonymizator_table || {};
    const entries = Object.values(table);
    const headers = ['Pseudonyme', 'Catégorie', 'Art. RGPD', 'Première détection', 'Dernière détection', 'Occurrences'];
    const rows = entries.map(e => [e.pseudonym, e.category, e.rgpdCategory, e.firstSeen, e.lastSeen, e.count]);
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadFile('anonymizator-correspondance.csv', csv, 'text/csv');
  });

  // Echappement HTML pour prévenir les injections XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialisation
  initTabs();
  loadCorrespondenceTable();
  loadPatternConfig();
  loadSites();
  loadJournal();
})();
