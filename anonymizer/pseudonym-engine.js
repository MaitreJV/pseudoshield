// anonymizer/pseudonym-engine.js
// Moteur de pseudonymisation : table de correspondance hashée + pseudonymes
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  // Compteurs par préfixe pour générer des pseudonymes uniques
  let counters = {};

  // Table volatile : pseudonyme → original (perdue au rechargement)
  const volatileMap = new Map();

  // Table persistée : hash → { pseudonym, category, rgpdCategory, firstSeen, lastSeen, count }
  let persistedTable = {};

  // Flag d'initialisation
  let initialized = false;

  // Sel par-installation (Art. 32 RGPD) : neutralise les tables de correspondance
  // pre-calculees contre les hash a faible entropie (NISS, IBAN, dates...). Stable
  // par installation -> le determinisme des pseudonymes est preserve entre sessions.
  let salt = '';

  /**
   * Génère un sel aléatoire (128 bits) en hexadécimal via Web Crypto.
   * @returns {string}
   */
  function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Initialise le moteur en chargeant la table persistée depuis chrome.storage.local
   * @returns {Promise<void>}
   */
  async function init() {
    if (initialized) return;

    try {
      const result = await chrome.storage.local.get(['pseudoshield_table', 'pseudoshield_counters', 'pseudoshield_salt']);
      salt = result.pseudoshield_salt || '';

      if (!salt) {
        // Première initialisation avec le schéma salé : on génère le sel et on repart
        // d'une table VIERGE (les anciens hash non salés deviennent caducs — reset assumé).
        salt = generateSalt();
        persistedTable = {};
        counters = {};
        await chrome.storage.local.set({
          pseudoshield_salt: salt,
          pseudoshield_table: {},
          pseudoshield_counters: {}
        });
        console.log('[PseudoShield] Sel par-installation généré, table réinitialisée');
      } else {
        persistedTable = result.pseudoshield_table || {};
        counters = result.pseudoshield_counters || {};
      }
      initialized = true;
      console.log('[PseudoShield] Moteur de pseudonymisation initialisé,', Object.keys(persistedTable).length, 'entrées chargées');
    } catch (e) {
      console.error('[PseudoShield] Erreur initialisation pseudonym-engine:', e);
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

    // Hash salé : SHA-256(sel + ':' + valeur normalisée). Le sel par-installation est
    // charge par init() (appele juste au-dessus), ce qui rend les hash non reproductibles
    // d'une installation a l'autre et casse les tables de correspondance pre-calculees.
    const hash = await window.PseudoShield.Hash.sha256(salt + ':' + original.trim().toLowerCase());

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
        pseudoshield_table: persistedTable,
        pseudoshield_counters: counters
      });
    } catch (e) {
      console.error('[PseudoShield] Erreur sauvegarde table:', e);
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
    await chrome.storage.local.remove(['pseudoshield_table', 'pseudoshield_counters']);
    console.log('[PseudoShield] Table de correspondance réinitialisée');
  }

  /**
   * Vérifie si un original est encore disponible en mémoire volatile
   * @param {string} pseudonym
   * @returns {boolean}
   */
  function isRevealable(pseudonym) {
    return volatileMap.has(pseudonym);
  }

  window.PseudoShield.PseudonymEngine = {
    init,
    getPseudonym,
    revealOriginal,
    isRevealable,
    getPersistedTable,
    getStats,
    reset
  };
})();
