// anonymizer/rgpd-logger.js
// Journal RGPD : log chaque opération d'anonymisation
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  const STORAGE_KEY = 'anonymizator_journal';
  let journal = [];
  let loaded = false;

  async function load() {
    if (loaded) return;
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      journal = result[STORAGE_KEY] || [];
      loaded = true;
    } catch (e) {
      console.error('[Anonymizator] Erreur chargement journal:', e);
      journal = [];
      loaded = true;
    }
  }

  let sessionId = null;
  function getSessionId() {
    if (!sessionId) {
      sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }
    return sessionId;
  }

  async function log(result, url) {
    await load();

    const entry = {
      timestamp: new Date().toISOString(),
      url: url || 'unknown',
      patternsTriggered: [...new Set(result.detections.map(d => d.patternId))],
      replacementsCount: result.replacementsCount,
      categoriesAffected: result.rgpdCategories,
      categoryCounts: result.categoryCounts,
      textLengthOriginal: result.originalText.length,
      textLengthAnonymized: result.anonymizedText.length,
      processingTimeMs: Math.round(result.processingTimeMs),
      sessionId: getSessionId()
    };

    journal.push(entry);

    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: journal });
    } catch (e) {
      console.error('[Anonymizator] Erreur sauvegarde journal:', e);
    }
  }

  async function getEntries() {
    await load();
    return [...journal];
  }

  async function getFiltered(filters = {}) {
    await load();
    return journal.filter(entry => {
      if (filters.startDate && entry.timestamp < filters.startDate) return false;
      if (filters.endDate && entry.timestamp > filters.endDate) return false;
      if (filters.url && !entry.url.includes(filters.url)) return false;
      return true;
    });
  }

  async function exportCSV() {
    await load();
    const headers = ['Timestamp', 'URL', 'Patterns', 'Remplacements', 'Art.4', 'Art.9', 'Taille originale', 'Taille anonymisée', 'Temps (ms)', 'Session'];
    const rows = journal.map(e => [
      e.timestamp,
      e.url,
      e.patternsTriggered.join('; '),
      e.replacementsCount,
      e.categoriesAffected.art4,
      e.categoriesAffected.art9,
      e.textLengthOriginal,
      e.textLengthAnonymized,
      e.processingTimeMs,
      e.sessionId
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
    ).join('\n');

    return csv;
  }

  async function exportJSON() {
    await load();
    return JSON.stringify(journal, null, 2);
  }

  async function purge() {
    journal = [];
    loaded = true;
    try {
      await chrome.storage.local.remove(STORAGE_KEY);
      console.log('[Anonymizator] Journal RGPD purgé');
    } catch (e) {
      console.error('[Anonymizator] Erreur purge journal:', e);
    }
  }

  async function getStats() {
    await load();
    return {
      totalOperations: journal.length,
      totalReplacements: journal.reduce((sum, e) => sum + e.replacementsCount, 0),
      totalArt4: journal.reduce((sum, e) => sum + e.categoriesAffected.art4, 0),
      totalArt9: journal.reduce((sum, e) => sum + e.categoriesAffected.art9, 0),
      sitesCovered: [...new Set(journal.map(e => e.url))],
      firstEntry: journal.length > 0 ? journal[0].timestamp : null,
      lastEntry: journal.length > 0 ? journal[journal.length - 1].timestamp : null
    };
  }

  window.Anonymizator.RgpdLogger = {
    log,
    getEntries,
    getFiltered,
    exportCSV,
    exportJSON,
    purge,
    getStats,
    getSessionId
  };
})();
