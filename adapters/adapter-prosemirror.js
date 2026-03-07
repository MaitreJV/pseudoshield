// adapters/adapter-prosemirror.js
// Adaptateur pour editeurs ProseMirror — Claude.ai et ChatGPT
// Utilise un paste synthetique (ClipboardEvent + DataTransfer) pour que ProseMirror
// traite le contenu via son propre pipeline de paste
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Insere du texte dans un editeur ProseMirror avec fallback cross-browser
   * Cascade : synthetic paste (Chrome) → execCommand (Firefox) → DOM direct (dernier recours)
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

    // Methode 1 : Synthetic ClipboardEvent (Chrome)
    // Firefox ignore clipboardData dans le constructeur (Bugzilla #1765765)
    try {
      var dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);

      var pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });

      // Feature detection : verifier que clipboardData a bien ete set
      // Sur Firefox, clipboardData est null apres construction → on saute au fallback
      if (pasteEvent.clipboardData &&
          pasteEvent.clipboardData.getData('text/plain') === text) {
        window.PseudoShield._syntheticPaste = true;
        try {
          element.dispatchEvent(pasteEvent);
          console.log('[PseudoShield] Synthetic paste dispatche sur', element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''));
          return true;
        } finally {
          window.PseudoShield._syntheticPaste = false;
        }
      }
    } catch (e) {
      // DataTransfer ou ClipboardEvent non supporte — on continue vers fallback
    }

    // Methode 2 : execCommand insertText (Firefox)
    // Declenche beforeinput avec inputType 'insertText', gere par ProseMirror
    try {
      var success = document.execCommand('insertText', false, text);
      if (success) {
        console.log('[PseudoShield] Insertion via execCommand (Firefox path)');
        return true;
      }
    } catch (e) {
      // execCommand echoue — on continue vers dernier recours
    }

    // Methode 3 : insertion DOM directe (dernier recours)
    console.warn('[PseudoShield] Fallback insertion DOM directe');
    window.PseudoShield.CursorManager.insertAtCursor(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
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
