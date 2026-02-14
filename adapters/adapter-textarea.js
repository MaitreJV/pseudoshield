// adapters/adapter-textarea.js
// Adaptateur pour textareas natifs — Copilot et DeepSeek
// Utilise le setter natif HTMLTextAreaElement.value pour contourner les frameworks reactifs
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Insere du texte via le setter natif de la propriete value
   * Necessaire pour les frameworks reactifs (React, Vue) qui interceptent les changements
   * @param {HTMLTextAreaElement} element - Textarea cible
   * @param {string} text - Texte a inserer
   * @returns {boolean} true si l'insertion a reussi
   */
  function insertViaNativeValue(element, text) {
    element.focus();

    var cm = window.PseudoShield.CursorManager;
    var result = cm.insertAtSelectionInInput(element, text);

    // Utiliser le setter natif pour contourner les frameworks reactifs
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );
    var nativeSetter = nativeInputValueSetter && nativeInputValueSetter.set;

    if (!nativeSetter) {
      var inputDescriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      );
      nativeSetter = inputDescriptor && inputDescriptor.set;
    }

    if (nativeSetter) {
      nativeSetter.call(element, result.newValue);
    } else {
      element.value = result.newValue;
    }

    // Repositionner le curseur apres le texte insere
    element.selectionStart = result.cursorPos;
    element.selectionEnd = result.cursorPos;

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Enregistrer l'adaptateur Copilot
  window.PseudoShield.AdapterRegistry.register({
    name: 'Copilot',
    selector: 'textarea, #searchbox textarea',
    detect: function() { return location.hostname === 'copilot.microsoft.com'; },
    insert: insertViaNativeValue
  });

  // Enregistrer l'adaptateur DeepSeek
  window.PseudoShield.AdapterRegistry.register({
    name: 'DeepSeek',
    selector: 'textarea#chat-input, textarea',
    detect: function() { return location.hostname.includes('deepseek.com'); },
    insert: insertViaNativeValue
  });
})();
