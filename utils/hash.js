// utils/hash.js
// Utilitaire de hachage SHA-256 via Web Crypto API
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

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

  window.PseudoShield.Hash = {
    sha256
  };
})();
