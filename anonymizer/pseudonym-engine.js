// anonymizer/pseudonym-engine.js
// Moteur de pseudonymisation : table de correspondance hashée + pseudonymes
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  // Compteurs par préfixe pour générer des pseudonymes uniques
  let counters = {};

  // Table volatile : pseudonyme → original (perdue au rechargement)
  const volatileMap = new Map();

  // Table persistée : hash → { pseudonym, category, rgpdCategory, firstSeen, lastSeen, count }
  let persistedTable = {};

  // Flag d'initialisation
  let initialized = false;

  /**
   * Initialise le moteur en chargeant la table persistée depuis chrome.storage.local
   * @returns {Promise<void>}
   */
  async function init() {
    if (initialized) return;

    try {
      const result = await chrome.storage.local.get(['anonymizator_table', 'anonymizator_counters']);
      persistedTable = result.anonymizator_table || {};
      counters = result.anonymizator_counters || {};
      initialized = true;
      console.log('[Anonymizator] Moteur de pseudonymisation initialisé,', Object.keys(persistedTable).length, 'entrées chargées');
    } catch (e) {
      console.error('[Anonymizator] Erreur initialisation pseudonym-engine:', e);
      persistedTable = {};
      counters = {};
      initialized = true;
    }
  }

  /**
   * Génère ou récupère un pseudonyme pour une donnée détectée
   * @param {string} original - Texte original détecté
   * @param {string} prefix - Préfixe du pseudonyme (ex: "Personne", "IBAN")
   * @param {string} category - Catégorie fonctionnelle
   * @param {string} rgpdCategory - Catégorie RGPD
   * @returns {Promise<string>} Pseudonyme généré
   */
  async function getPseudonym(original, prefix, category, rgpdCategory) {
    await init();

    const hash = await window.Anonymizator.Hash.sha256(original.trim().toLowerCase());

    // Vérifier si déjà connu
    if (persistedTable[hash]) {
      persistedTable[hash].lastSeen = new Date().toISOString();
      persistedTable[hash].count++;

      // Stocker l'original en mémoire volatile
      volatileMap.set(persistedTable[hash].pseudonym, original);

      await save();
      return persistedTable[hash].pseudonym;
    }

    // Nouveau : générer un pseudonyme
    if (!counters[prefix]) counters[prefix] = 0;
    counters[prefix]++;

    const pseudonym = prefix + '_' + counters[prefix];

    persistedTable[hash] = {
      pseudonym,
      category,
      rgpdCategory,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      count: 1
    };

    // Stocker l'original en mémoire volatile
    volatileMap.set(pseudonym, original);

    await save();
    return pseudonym;
  }

  /**
   * Sauvegarde la table persistée dans chrome.storage.local
   * @returns {Promise<void>}
   */
  async function save() {
    try {
      await chrome.storage.local.set({
        anonymizator_table: persistedTable,
        anonymizator_counters: counters
      });
    } catch (e) {
      console.error('[Anonymizator] Erreur sauvegarde table:', e);
    }
  }

  /**
   * Récupère l'original à partir d'un pseudonyme (volatile uniquement)
   * @param {string} pseudonym - Pseudonyme à résoudre
   * @returns {string|null} Original ou null si non disponible
   */
  function revealOriginal(pseudonym) {
    return volatileMap.get(pseudonym) || null;
  }

  /**
   * Retourne la table persistée (sans les originaux)
   * @returns {Object}
   */
  function getPersistedTable() {
    return { ...persistedTable };
  }

  /**
   * Retourne les stats de la table
   * @returns {{ total: number, byCategory: Object, byRgpd: Object }}
   */
  function getStats() {
    const entries = Object.values(persistedTable);
    return {
      total: entries.length,
      byCategory: entries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {}),
      byRgpd: entries.reduce((acc, e) => {
        acc[e.rgpdCategory] = (acc[e.rgpdCategory] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Réinitialise toute la table (session reset)
   * @returns {Promise<void>}
   */
  async function reset() {
    counters = {};
    volatileMap.clear();
    persistedTable = {};
    await chrome.storage.local.remove(['anonymizator_table', 'anonymizator_counters']);
    console.log('[Anonymizator] Table de correspondance réinitialisée');
  }

  /**
   * Vérifie si un original est encore disponible en mémoire volatile
   * @param {string} pseudonym
   * @returns {boolean}
   */
  function isRevealable(pseudonym) {
    return volatileMap.has(pseudonym);
  }

  window.Anonymizator.PseudonymEngine = {
    init,
    getPseudonym,
    revealOriginal,
    isRevealable,
    getPersistedTable,
    getStats,
    reset
  };
})();
