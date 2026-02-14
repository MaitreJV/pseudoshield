// adapters/adapter-prosemirror.js
// Adaptateur pour editeurs ProseMirror — Claude.ai et ChatGPT
// Utilise un paste synthetique (ClipboardEvent + DataTransfer) pour que ProseMirror
// traite le contenu via son propre pipeline de paste
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Insere du texte via paste synthetique pour ProseMirror
   * Le flag _syntheticPaste empeche content.js de re-intercepter l'evenement
   * @param {HTMLElement} element - Element contentEditable ProseMirror
   * @param {string} text - Texte a inserer
   * @returns {boolean} true si l'insertion a reussi
   */
  function insertViaSyntheticPaste(element, text) {
    element.focus();

    // Placer le curseur a la fin si pas de selection active
    if (element.contentEditable === 'true') {
      window.PseudoShield.CursorManager.moveToEnd(element);
    }

    // Marquer comme synthetique pour que handlePaste l'ignore
    window.PseudoShield._syntheticPaste = true;

    try {
      var dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);

      var pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(pasteEvent);
      console.log('[PseudoShield] Synthetic paste dispatche sur', element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''));
      return true;
    } catch (e) {
      console.warn('[PseudoShield] Synthetic paste echoue, fallback inputEvent:', e);
      // Fallback vers insertion directe
      window.PseudoShield.CursorManager.insertAtCursor(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } finally {
      window.PseudoShield._syntheticPaste = false;
    }
  }

  // Enregistrer l'adaptateur Claude.ai
  window.PseudoShield.AdapterRegistry.register({
    name: 'Claude',
    selector: 'div.ProseMirror[contenteditable="true"], div[contenteditable="true"]',
    detect: function() { return location.hostname === 'claude.ai'; },
    insert: insertViaSyntheticPaste
  });

  // Enregistrer l'adaptateur ChatGPT
  window.PseudoShield.AdapterRegistry.register({
    name: 'ChatGPT',
    selector: '#prompt-textarea, div[contenteditable="true"][id="prompt-textarea"]',
    detect: function() { return location.hostname === 'chatgpt.com'; },
    insert: insertViaSyntheticPaste
  });
})();
