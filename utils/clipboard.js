// utils/clipboard.js
// Gestion du clipboard cross-browser
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  function getTextFromPasteEvent(event) {
    if (event.clipboardData) {
      return event.clipboardData.getData('text/plain') || '';
    }
    if (window.clipboardData) {
      return window.clipboardData.getData('Text') || '';
    }
    return '';
  }

  window.PseudoShield.Clipboard = {
    getTextFromPasteEvent
  };
})();
