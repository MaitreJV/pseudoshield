// options.js
(function() {
  'use strict';

  // Debounce inline — options.html ne charge pas les content_scripts
  function debounce(fn, delay) {
    var timer;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
  }

  // Regex de validation de domaine
  var DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

  // Domaines couverts statiquement par le manifest (aucune permission a demander).
  var STATIC_DOMAINS = ['claude.ai', 'chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com', 'chat.deepseek.com', 'perplexity.ai'];

  // Patterns d'origine pour la demande de permission host d'un domaine custom.
  function originPatternsForDomain(domain) {
    return ['https://' + domain + '/*', 'https://*.' + domain + '/*'];
  }

  // Vrai si le domaine est deja couvert statiquement par le manifest (apex ou sous-domaine).
  function isStaticDomain(domain) {
    return STATIC_DOMAINS.some(s => domain === s || domain.endsWith('.' + s));
  }

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
    const result = await chrome.storage.local.get(['pseudoshield_table']);
    const table = result.pseudoshield_table || {};
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
    const result = await chrome.storage.local.get('pseudoshield_disabled_patterns');
    const disabledPatterns = result.pseudoshield_disabled_patterns || [];
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
      { id: 'NOM_MULTICONTEXTE', label: 'Nom propre (multi-mots)', category: 'identite', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'NOM_CONSECUTIF', label: 'Nom propre (heuristique)', category: 'identite', rgpdCategory: 'art4', confidence: 'low' },
      { id: 'SECU_FR', label: 'Securite sociale FR', category: 'identite', rgpdCategory: 'art9', confidence: 'high' },
      { id: 'PASSPORT_BE', label: 'Passeport belge', category: 'identite', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'PASSPORT_FR', label: 'Passeport francais', category: 'identite', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'INAMI_BE', label: 'Numero INAMI', category: 'identite', rgpdCategory: 'art4', confidence: 'high' },
      { id: 'GPS_COORD', label: 'Coordonnees GPS', category: 'technique', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'URL_PII', label: 'URL avec donnees personnelles', category: 'technique', rgpdCategory: 'art4', confidence: 'medium' },
      { id: 'SOCIAL_HANDLE', label: 'Handle reseau social', category: 'contact', rgpdCategory: 'art4', confidence: 'low' }
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

    // Sauvegarde debounced des patterns desactives (300ms)
    var pendingDisabled = null;
    var debouncedSavePatterns = debounce(async function() {
      if (pendingDisabled !== null) {
        await chrome.storage.local.set({ pseudoshield_disabled_patterns: pendingDisabled });
      }
    }, 300);

    // Ecoute des changements de toggle
    container.addEventListener('change', async (e) => {
      if (e.target.dataset.patternId) {
        const result = await chrome.storage.local.get('pseudoshield_disabled_patterns');
        const disabled = result.pseudoshield_disabled_patterns || [];
        const id = e.target.dataset.patternId;

        if (e.target.checked) {
          const idx = disabled.indexOf(id);
          if (idx > -1) disabled.splice(idx, 1);
        } else {
          if (!disabled.includes(id)) disabled.push(id);
        }

        pendingDisabled = disabled;
        debouncedSavePatterns();
      }
    });
  }

  // Chargement et gestion du seuil de confiance
  async function loadConfidenceThreshold() {
    const result = await chrome.storage.local.get('pseudoshield_confidence_threshold');
    const threshold = result.pseudoshield_confidence_threshold || 'low';

    // Cocher le radio button correspondant
    const radios = document.querySelectorAll('input[name="confidence-threshold"]');
    radios.forEach(radio => {
      radio.checked = (radio.value === threshold);
    });

    // Ecouter les changements
    radios.forEach(radio => {
      radio.addEventListener('change', async (e) => {
        if (e.target.checked) {
          await chrome.storage.local.set({ pseudoshield_confidence_threshold: e.target.value });
        }
      });
    });
  }

  // Onglet 3 : Sites surveilles (plateformes statiques du manifest + domaines custom).
  // Ajouter un domaine custom demande la permission host correspondante puis enregistre
  // dynamiquement le content script via le service worker (messages registerSite/unregisterSite).
  async function loadSites() {
    const store = await chrome.storage.local.get(['pseudoshield_whitelist', 'pseudoshield_pending_permissions']);
    const whitelist = store.pseudoshield_whitelist || STATIC_DOMAINS.slice();
    let pending = store.pseudoshield_pending_permissions || [];

    const listEl = document.getElementById('sites-list');
    const pendingEl = document.getElementById('sites-pending');
    const input = document.getElementById('add-site-input');

    function persistWhitelist() {
      return chrome.storage.local.set({ pseudoshield_whitelist: whitelist });
    }
    function persistPending() {
      return chrome.storage.local.set({ pseudoshield_pending_permissions: pending });
    }

    function renderSites() {
      if (whitelist.length === 0) {
        listEl.innerHTML = '<div class="sites-empty">Aucun site configuré</div>';
        return;
      }
      listEl.innerHTML = whitelist.map((domain, i) => {
        const tag = isStaticDomain(domain)
          ? '<span class="site-tag">par défaut</span>'
          : '<span class="site-tag site-tag-custom">ajouté</span>';
        return '<div class="site-item">' +
          '<span class="site-domain">' + escapeHtml(domain) + '</span>' +
          tag +
          '<button class="btn-remove" data-index="' + i + '" title="Retirer ce domaine">&#10005;</button>' +
        '</div>';
      }).join('');
    }

    function renderPending() {
      if (!pending || pending.length === 0) {
        pendingEl.innerHTML = '';
        return;
      }
      pendingEl.innerHTML =
        '<div class="sites-pending-title">En attente d\'autorisation</div>' +
        pending.map(domain =>
          '<div class="site-item site-item-pending">' +
            '<span class="site-domain">' + escapeHtml(domain) + '</span>' +
            '<button class="btn btn-secondary btn-authorize" data-domain="' + escapeHtml(domain) + '">Autoriser</button>' +
          '</div>'
        ).join('');
    }

    renderSites();
    renderPending();

    // Retrait d'un domaine
    listEl.addEventListener('click', async (e) => {
      if (!e.target.classList.contains('btn-remove')) return;
      const idx = parseInt(e.target.dataset.index, 10);
      const domain = whitelist[idx];
      if (domain === undefined) return;
      whitelist.splice(idx, 1);
      await persistWhitelist();
      renderSites();
      // Domaine custom : desenregistrer le content script + retirer la permission host.
      if (!isStaticDomain(domain)) {
        try { await chrome.runtime.sendMessage({ type: 'unregisterSite', domain }); } catch (err) { /* ignore */ }
      }
    });

    // Ajout d'un domaine
    document.getElementById('add-site-btn').addEventListener('click', async () => {
      const domain = input.value.trim().toLowerCase();
      if (!domain) return;

      if (!DOMAIN_REGEX.test(domain)) {
        alert('Format de domaine invalide. Exemples valides : exemple.com, ia.mon-organisation.be');
        return;
      }
      if (whitelist.includes(domain)) {
        alert('Ce domaine est deja dans la liste.');
        return;
      }

      // Domaine statique : simple (re)activation, aucune permission requise.
      if (isStaticDomain(domain)) {
        whitelist.push(domain);
        await persistWhitelist();
        input.value = '';
        renderSites();
        return;
      }

      // Domaine custom : demander la permission host DANS le geste utilisateur.
      // chrome.permissions.request doit etre le premier appel async (sinon Chrome
      // considere qu'il n'y a pas de geste utilisateur et rejette la demande).
      let granted = false;
      try {
        granted = await chrome.permissions.request({ origins: originPatternsForDomain(domain) });
      } catch (err) {
        alert('La demande d\'autorisation a echoue.');
        return;
      }
      if (!granted) return; // Refus : on n'ecrit RIEN (pas de faux positif comme avant).

      const resp = await chrome.runtime.sendMessage({ type: 'registerSite', domain });
      if (resp && resp.ok) {
        whitelist.push(domain);
        await persistWhitelist();
        input.value = '';
        renderSites();
      } else {
        // Echec d'enregistrement : retirer la permission obtenue pour ne pas la laisser orpheline.
        try { await chrome.permissions.remove({ origins: originPatternsForDomain(domain) }); } catch (err) { /* ignore */ }
        alert('Impossible d\'activer la protection sur ce domaine.');
      }
    });

    // Ajout avec la touche Entree
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('add-site-btn').click();
    });

    // Autoriser un domaine "en attente" (migration : present dans la whitelist sans permission)
    pendingEl.addEventListener('click', async (e) => {
      if (!e.target.classList.contains('btn-authorize')) return;
      const domain = e.target.dataset.domain;
      if (!domain) return;
      let granted = false;
      try {
        granted = await chrome.permissions.request({ origins: originPatternsForDomain(domain) });
      } catch (err) { return; }
      if (!granted) return;
      const resp = await chrome.runtime.sendMessage({ type: 'registerSite', domain });
      if (resp && resp.ok) {
        pending = pending.filter(d => d !== domain);
        await persistPending();
        if (!whitelist.includes(domain)) { whitelist.push(domain); await persistWhitelist(); }
        renderSites();
        renderPending();
      } else {
        try { await chrome.permissions.remove({ origins: originPatternsForDomain(domain) }); } catch (err) { /* ignore */ }
        alert('Impossible d\'activer la protection sur ce domaine.');
      }
    });
  }

  // Onglet 4 : Journal RGPD
  async function loadJournal() {
    const result = await chrome.storage.local.get('pseudoshield_journal');
    const journal = result.pseudoshield_journal || [];
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
      downloadFile('pseudoshield-journal.csv', csv, 'text/csv');
    });

    // Export JSON
    document.getElementById('journal-export-json').addEventListener('click', () => {
      downloadFile('pseudoshield-journal.json', JSON.stringify(journal, null, 2), 'application/json');
    });

    // Purge
    document.getElementById('journal-purge').addEventListener('click', async () => {
      if (confirm('Supprimer définitivement tout le journal RGPD ?')) {
        await chrome.storage.local.remove('pseudoshield_journal');
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
    const result = await chrome.storage.local.get(['pseudoshield_table']);
    const table = result.pseudoshield_table || {};
    const entries = Object.values(table);
    const headers = ['Pseudonyme', 'Catégorie', 'Art. RGPD', 'Première détection', 'Dernière détection', 'Occurrences'];
    const rows = entries.map(e => [e.pseudonym, e.category, e.rgpdCategory, e.firstSeen, e.lastSeen, e.count]);
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadFile('pseudoshield-correspondance.csv', csv, 'text/csv');
  });

  // Echappement HTML pour prévenir les injections XSS (guillemets inclus, pour usage en attribut)
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  // Initialisation
  initTabs();
  loadCorrespondenceTable();
  loadPatternConfig();
  loadConfidenceThreshold();
  loadSites();
  loadJournal();
})();
