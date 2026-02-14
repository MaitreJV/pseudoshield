// utils/debounce.js
// Utilitaire debounce pour limiter la frequence d'appels de fonctions
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Cree une version debounced d'une fonction
   * La fonction ne sera executee qu'apres 'delay' ms sans nouvel appel
   * @param {Function} fn - Fonction a debouncer
   * @param {number} delay - Delai en millisecondes
   * @returns {Function} Fonction debounced
   */
  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  window.PseudoShield.debounce = debounce;
})();
