// adapters/cursor-manager.js
// Gestion unifiee du curseur — elimine la duplication dans les adaptateurs
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Positionne le curseur a la fin d'un element contentEditable
   * @param {HTMLElement} element - Element contentEditable
   */
  function moveToEnd(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount || !element.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Insere du texte a la position actuelle du curseur dans un contentEditable
   * Remplace la selection courante si elle existe
   * @param {HTMLElement} element - Element contentEditable
   * @param {string} text - Texte a inserer
   */
  function insertAtCursor(element, text) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    } else {
      element.textContent += text;
    }
  }

  /**
   * Insere du texte a la position du curseur dans un textarea/input
   * Remplace la selection courante si elle existe
   * @param {HTMLTextAreaElement|HTMLInputElement} element - Element de formulaire
   * @param {string} text - Texte a inserer
   * @returns {{ newValue: string, cursorPos: number }} Nouveau contenu et position du curseur
   */
  function insertAtSelectionInInput(element, text) {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const currentValue = element.value || '';
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    const cursorPos = start + text.length;
    return { newValue, cursorPos };
  }

  window.PseudoShield.CursorManager = {
    moveToEnd,
    insertAtCursor,
    insertAtSelectionInInput
  };
})();
