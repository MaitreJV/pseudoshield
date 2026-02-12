// utils/hash.js
// Utilitaire de hachage SHA-256 via Web Crypto API
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  /**
   * Calcule le hash SHA-256 d'une chaîne
   * @param {string} text - Texte à hasher
   * @returns {Promise<string>} Hash en hexadécimal
   */
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const hashCache = new Map();

  /**
   * Version avec cache pour éviter les recalculs
   * @param {string} text - Texte à hasher
   * @returns {Promise<string>} Hash en hexadécimal
   */
  function sha256Cached(text) {
    if (hashCache.has(text)) {
      return Promise.resolve(hashCache.get(text));
    }
    return sha256(text).then(hash => {
      hashCache.set(text, hash);
      return hash;
    });
  }

  /**
   * Vide le cache de hashs
   */
  function clearHashCache() {
    hashCache.clear();
  }

  window.Anonymizator.Hash = {
    sha256,
    sha256Cached,
    clearHashCache
  };
})();
