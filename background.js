// background.js
// Service worker : état global, messages inter-composants, badge compteur
(function() {
  'use strict';

  let sessionCount = 0;
  let sessionStats = {
    total: 0,
    art4: 0,
    art9: 0,
    categoryCounts: {}
  };

  function updateBadge(count) {
    const text = count > 0 ? String(count) : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#00b894' : '#666666' });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'anonymization_done':
        sessionCount += message.count || 0;
        sessionStats.total += message.count || 0;
        sessionStats.art4 += message.rgpdCategories?.art4 || 0;
        sessionStats.art9 += message.rgpdCategories?.art9 || 0;

        if (message.categoryCounts) {
          for (const [cat, count] of Object.entries(message.categoryCounts)) {
            sessionStats.categoryCounts[cat] = (sessionStats.categoryCounts[cat] || 0) + count;
          }
        }

        updateBadge(sessionCount);
        sendResponse({ ok: true });
        break;

      case 'getSessionStats':
        sendResponse({ stats: sessionStats, count: sessionCount });
        break;

      case 'resetSession':
        sessionCount = 0;
        sessionStats = { total: 0, art4: 0, art9: 0, categoryCounts: {} };
        updateBadge(0);
        sendResponse({ ok: true });
        break;

      case 'toggle':
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            try {
              chrome.tabs.sendMessage(tab.id, { type: 'toggle', enabled: message.enabled });
            } catch (e) {
              // Certains onglets peuvent ne pas avoir le content script
            }
          }
        });

        chrome.storage.local.set({ anonymizator_enabled: message.enabled });

        chrome.action.setBadgeBackgroundColor({
          color: message.enabled ? '#00b894' : '#666666'
        });

        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ error: 'Type de message inconnu: ' + message.type });
    }

    return true; // Garder le canal ouvert pour sendResponse async
  });

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.storage.local.set({
        anonymizator_enabled: true,
        anonymizator_whitelist: [
          'claude.ai',
          'chatgpt.com',
          'gemini.google.com',
          'copilot.microsoft.com',
          'chat.deepseek.com',
          'perplexity.ai'
        ],
        anonymizator_allSites: false
      });
      console.log('[Anonymizator] Extension installée, configuration par défaut appliquée');
    }
  });

  console.log('[Anonymizator] Background service worker démarré');
})();
