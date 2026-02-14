// adapters/adapter-generic.js
// Adaptateur fallback utilisant execCommand — doit etre charge AVANT adapter-registry.js
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  window.PseudoShield.AdapterGeneric = {
    name: 'Generique',
    selector: 'textarea:focus, [contenteditable="true"]:focus, input[type="text"]:focus',
    detect: function() { return true; },

    /**
     * Insere du texte via execCommand (methode la plus compatible)
     * Fallback vers CursorManager si execCommand echoue
     * @param {HTMLElement} element - Element cible
     * @param {string} text - Texte a inserer
     * @returns {boolean} true si l'insertion a reussi
     */
    insert: function(element, text) {
      element.focus();
      var success = document.execCommand('insertText', false, text);

      if (!success) {
        var cm = window.PseudoShield.CursorManager;
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          var result = cm.insertAtSelectionInInput(element, text);
          element.value = result.newValue;
          element.selectionStart = result.cursorPos;
          element.selectionEnd = result.cursorPos;
        } else {
          cm.insertAtCursor(element, text);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }
  };
})();
