// utils/site-adapters.js
// Shim de compatibilite — delegue a AdapterRegistry
// Ce fichier maintient l'API window.PseudoShield.SiteAdapters pour que
// content.js continue de fonctionner sans modification majeure
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  var registry = window.PseudoShield.AdapterRegistry;

  window.PseudoShield.SiteAdapters = {
    getAdapter: function() {
      return registry.getAdapter();
    },
    insertText: function(element, text, adapter) {
      return registry.insertText(element, text, adapter);
    },
    findTarget: function(adapter) {
      return registry.findTarget(adapter);
    }
  };
})();
