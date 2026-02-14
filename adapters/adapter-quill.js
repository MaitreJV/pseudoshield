// adapters/adapter-quill.js
// Adaptateur pour editeurs Quill et variantes — Gemini et Perplexity
// Utilise InputEvent 'insertFromPaste' pour les editeurs riches non-ProseMirror
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Insere du texte via InputEvent pour les editeurs riches (Quill, etc.)
   * Combine insertion manuelle dans le DOM et dispatching d'un InputEvent
   * @param {HTMLElement} element - Element contentEditable
   * @param {string} text - Texte a inserer
   * @returns {boolean} true si l'insertion a reussi
   */
  function insertViaInputEvent(element, text) {
    element.focus();

    var inputEvent = new InputEvent('input', {
      inputType: 'insertFromPaste',
      data: text,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    if (element.contentEditable === 'true') {
      window.PseudoShield.CursorManager.insertAtCursor(element, text);
    }

    element.dispatchEvent(inputEvent);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Enregistrer l'adaptateur Gemini
  window.PseudoShield.AdapterRegistry.register({
    name: 'Gemini',
    selector: 'rich-textarea .ql-editor, div[contenteditable="true"]',
    detect: function() { return location.hostname === 'gemini.google.com'; },
    insert: function(element, text) {
      element.focus();
      // Gemini utilise execCommand comme fallback principal
      var success = document.execCommand('insertText', false, text);
      if (!success) {
        return insertViaInputEvent(element, text);
      }
      return true;
    }
  });

  // Enregistrer l'adaptateur Perplexity
  window.PseudoShield.AdapterRegistry.register({
    name: 'Perplexity',
    selector: 'textarea, div[contenteditable="true"]',
    detect: function() { return location.hostname === 'perplexity.ai'; },
    insert: insertViaInputEvent
  });
})();
