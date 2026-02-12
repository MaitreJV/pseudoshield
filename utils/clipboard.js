// utils/clipboard.js
// Gestion du clipboard cross-browser
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  function getTextFromPasteEvent(event) {
    if (event.clipboardData) {
      return event.clipboardData.getData('text/plain') || '';
    }
    if (window.clipboardData) {
      return window.clipboardData.getData('Text') || '';
    }
    return '';
  }

  window.Anonymizator.Clipboard = {
    getTextFromPasteEvent
  };
})();
