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
    // Ignorer les paste synthétiques émis par insertViaSyntheticPaste
    // pour éviter une boucle infinie (notre handler intercepte notre propre paste)
    if (window.Anonymizator._syntheticPaste) return;

    // Extraire le texte AVANT tout await (synchrone)
    const text = window.Anonymizator.Clipboard.getTextFromPasteEvent(event);
    if (!text || text.trim().length === 0) return;

    // preventDefault SYNCHRONE pour bloquer le collage par défaut du navigateur
    // Sinon le texte original est inséré avant que le traitement async ne termine
    event.preventDefault();
    event.stopImmediatePropagation();

    const adapter = window.Anonymizator.SiteAdapters.getAdapter();
    const target = event.target || window.Anonymizator.SiteAdapters.findTarget(adapter);

    // Vérifier si l'extension est active (async)
    isEnabled = await checkEnabled();
    if (!isEnabled) {
      // Réinsérer le texte original puisqu'on a bloqué le paste
      if (target) window.Anonymizator.SiteAdapters.insertText(target, text, adapter);
      return;
    }

    try {
      // Charger les patterns désactivés depuis la config
      const config = await chrome.storage.local.get('anonymizator_disabled_patterns');
      const disabledPatterns = config.anonymizator_disabled_patterns || [];
      const allPatternIds = [
        ...(window.Anonymizator.PatternsEU || []),
        ...(window.Anonymizator.PatternsGeneric || [])
      ].map(p => p.id);
      const enabledPatterns = allPatternIds.filter(id => !disabledPatterns.includes(id));

      const result = await window.Anonymizator.Processor.process(text, { enabledPatterns });

      if (result.replacementsCount === 0) {
        // Aucune détection : réinsérer le texte original
        if (target) window.Anonymizator.SiteAdapters.insertText(target, text, adapter);
        return;
      }

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
      // En cas d'erreur, réinsérer le texte original
      if (target) window.Anonymizator.SiteAdapters.insertText(target, text, adapter);
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
