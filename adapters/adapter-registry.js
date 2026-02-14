// adapters/adapter-registry.js
// Registre central des adaptateurs de site — charge APRES adapter-generic.js
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  var adapters = [];
  var fallback = window.PseudoShield.AdapterGeneric;

  /**
   * Enregistre un adaptateur dans le registre
   * Les adaptateurs sont testes dans l'ordre d'enregistrement
   * @param {Object} adapter - Adaptateur avec detect(), insert(), name, selector
   */
  function register(adapter) {
    adapters.push(adapter);
  }

  /**
   * Trouve l'adaptateur adapte au site courant
   * Teste chaque adaptateur enregistre via sa methode detect()
   * @returns {Object} L'adaptateur correspondant ou le fallback generique
   */
  function getAdapter() {
    for (var i = 0; i < adapters.length; i++) {
      if (adapters[i].detect()) {
        return adapters[i];
      }
    }
    return fallback;
  }

  /**
   * Insere du texte via l'adaptateur specifie
   * @param {HTMLElement} element - Element cible
   * @param {string} text - Texte a inserer
   * @param {Object} adapter - Adaptateur a utiliser
   * @returns {boolean} true si l'insertion a reussi
   */
  function insertText(element, text, adapter) {
    if (!element || !text) return false;
    try {
      return adapter.insert(element, text);
    } catch (e) {
      console.warn('[PseudoShield] Adaptateur', adapter.name, 'echoue, fallback generique:', e);
      return fallback.insert(element, text);
    }
  }

  /**
   * Trouve l'element cible pour l'insertion de texte
   * Priorite : element actif > selecteur de l'adaptateur
   * @param {Object} adapter - Adaptateur avec un selecteur
   * @returns {HTMLElement|null} Element cible
   */
  function findTarget(adapter) {
    var active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.contentEditable === 'true')) {
      return active;
    }
    return document.querySelector(adapter.selector);
  }

  window.PseudoShield.AdapterRegistry = {
    register: register,
    getAdapter: getAdapter,
    insertText: insertText,
    findTarget: findTarget
  };
})();
