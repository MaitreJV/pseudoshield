// content.js
// Content script : intercepte le collage et anonymise le texte
(function() {
  'use strict';

  console.log('[Anonymizator] Content script chargé sur', location.hostname);

  let isEnabled = true;

  async function checkEnabled() {
    try {
      const result = await chrome.storage.local.get(['anonymizator_enabled', 'anonymizator_whitelist', 'anonymizator_allSites']);

      if (result.anonymizator_enabled === false) return false;

      if (result.anonymizator_allSites === true) return true;

      const whitelist = result.anonymizator_whitelist || [
        'claude.ai',
        'chatgpt.com',
        'gemini.google.com',
        'copilot.microsoft.com',
        'chat.deepseek.com',
        'perplexity.ai'
      ];

      return whitelist.some(domain => location.hostname.includes(domain));
    } catch (e) {
      console.error('[Anonymizator] Erreur vérification état:', e);
      return true;
    }
  }

  async function handlePaste(event) {
    isEnabled = await checkEnabled();
    if (!isEnabled) return;

    const text = window.Anonymizator.Clipboard.getTextFromPasteEvent(event);
    if (!text || text.trim().length === 0) return;

    const adapter = window.Anonymizator.SiteAdapters.getAdapter();

    try {
      const result = await window.Anonymizator.Processor.process(text);

      if (result.replacementsCount === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const target = event.target || window.Anonymizator.SiteAdapters.findTarget(adapter);

      if (target) {
        window.Anonymizator.SiteAdapters.insertText(target, result.anonymizedText, adapter);
      }

      window.Anonymizator.Toast.show(result);

      await window.Anonymizator.RgpdLogger.log(result, location.hostname);

      try {
        chrome.runtime.sendMessage({
          type: 'anonymization_done',
          count: result.replacementsCount,
          rgpdCategories: result.rgpdCategories,
          categoryCounts: result.categoryCounts
        });
      } catch (e) {
        // Le background peut ne pas être actif
      }

      console.log('[Anonymizator]', result.replacementsCount, 'données anonymisées en', Math.round(result.processingTimeMs), 'ms');

    } catch (e) {
      console.error('[Anonymizator] Erreur traitement:', e);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle') {
      isEnabled = message.enabled;
      console.log('[Anonymizator]', isEnabled ? 'Activé' : 'Désactivé');
      sendResponse({ ok: true });
    }
    if (message.type === 'getStatus') {
      sendResponse({ enabled: isEnabled, hostname: location.hostname });
    }
  });

  document.addEventListener('paste', handlePaste, true);

  if (window.Anonymizator.PseudonymEngine) {
    window.Anonymizator.PseudonymEngine.init().then(() => {
      console.log('[Anonymizator] Prêt');
    });
  }
})();
