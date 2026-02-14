// content.js
// Content script : intercepte le collage et anonymise le texte
(function() {
  'use strict';

  console.log('[PseudoShield] Content script chargé sur', location.hostname);

  let isEnabled = true;

  async function checkEnabled() {
    try {
      const result = await chrome.storage.local.get(['pseudoshield_enabled', 'pseudoshield_whitelist', 'pseudoshield_allSites']);

      if (result.pseudoshield_enabled === false) return false;

      if (result.pseudoshield_allSites === true) return true;

      const whitelist = result.pseudoshield_whitelist || [
        'claude.ai',
        'chatgpt.com',
        'gemini.google.com',
        'copilot.microsoft.com',
        'chat.deepseek.com',
        'perplexity.ai'
      ];

      // Validation stricte par suffixe — empeche les attaques par sous-domaine
      // evil-claude.ai ne matche PAS claude.ai, sub.claude.ai matche claude.ai
      return whitelist.some(domain =>
        location.hostname === domain || location.hostname.endsWith('.' + domain)
      );
    } catch (e) {
      console.error('[PseudoShield] Erreur vérification état:', e);
      return true;
    }
  }

  async function handlePaste(event) {
    // Ignorer les paste synthétiques émis par insertViaSyntheticPaste
    // pour éviter une boucle infinie (notre handler intercepte notre propre paste)
    if (window.PseudoShield._syntheticPaste) return;

    // Extraire le texte AVANT tout await (synchrone)
    const text = window.PseudoShield.Clipboard.getTextFromPasteEvent(event);
    if (!text || text.trim().length === 0) return;

    // preventDefault SYNCHRONE pour bloquer le collage par défaut du navigateur
    // Sinon le texte original est inséré avant que le traitement async ne termine
    event.preventDefault();
    event.stopImmediatePropagation();

    const adapter = window.PseudoShield.SiteAdapters.getAdapter();
    const target = event.target || window.PseudoShield.SiteAdapters.findTarget(adapter);

    // Vérifier si l'extension est active (async)
    isEnabled = await checkEnabled();
    if (!isEnabled) {
      // Réinsérer le texte original puisqu'on a bloqué le paste
      if (target) window.PseudoShield.SiteAdapters.insertText(target, text, adapter);
      return;
    }

    try {
      // Charger la config : patterns desactives et seuil de confiance
      const config = await chrome.storage.local.get([
        'pseudoshield_disabled_patterns',
        'pseudoshield_confidence_threshold'
      ]);
      const disabledPatterns = config.pseudoshield_disabled_patterns || [];
      const confidenceThreshold = config.pseudoshield_confidence_threshold || 'low';
      const allPatternIds = [
        ...(window.PseudoShield.PatternsEU || []),
        ...(window.PseudoShield.PatternsGeneric || []),
        ...(window.PseudoShield.PatternsDigital || [])
      ].map(p => p.id);
      const enabledPatterns = allPatternIds.filter(id => !disabledPatterns.includes(id));

      const result = await window.PseudoShield.Processor.process(text, {
        enabledPatterns,
        confidenceThreshold
      });

      if (result.replacementsCount === 0) {
        // Aucune détection : réinsérer le texte original
        if (target) window.PseudoShield.SiteAdapters.insertText(target, text, adapter);
        return;
      }

      if (target) {
        window.PseudoShield.SiteAdapters.insertText(target, result.pseudonymizedText, adapter);
      }

      window.PseudoShield.Toast.show(result);

      await window.PseudoShield.RgpdLogger.log(result, location.hostname);

      try {
        chrome.runtime.sendMessage({
          type: 'pseudonymization_done',
          count: result.replacementsCount,
          rgpdCategories: result.rgpdCategories,
          categoryCounts: result.categoryCounts
        });
      } catch (e) {
        // Le background peut ne pas être actif
      }

      console.log('[PseudoShield]', result.replacementsCount, 'données anonymisées en', Math.round(result.processingTimeMs), 'ms');

    } catch (e) {
      console.error('[PseudoShield] Erreur traitement:', e);
      // En cas d'erreur, réinsérer le texte original
      if (target) window.PseudoShield.SiteAdapters.insertText(target, text, adapter);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle') {
      isEnabled = message.enabled;
      console.log('[PseudoShield]', isEnabled ? 'Activé' : 'Désactivé');
      sendResponse({ ok: true });
    }
    if (message.type === 'getStatus') {
      sendResponse({ enabled: isEnabled, hostname: location.hostname });
    }
  });

  document.addEventListener('paste', handlePaste, true);

  if (window.PseudoShield.PseudonymEngine) {
    window.PseudoShield.PseudonymEngine.init().then(() => {
      console.log('[PseudoShield] Prêt');
    });
  }
})();
