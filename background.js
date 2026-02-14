// background.js
// Service worker : etat global, messages inter-composants, badge compteur
// Art. 4(5) RGPD — pseudonymisation (pas anonymisation)
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
      case 'pseudonymization_done':
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

      // Compatibilite v1 — accepter l'ancien message type pendant la transition
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

        chrome.storage.local.set({ pseudoshield_enabled: message.enabled });

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

  /**
   * Migration storage v1 (anonymizator_*) → v2 (pseudoshield_*)
   * Copie les anciennes cles vers les nouvelles, conserve les anciennes 30 jours
   */
  async function migrateStorageV1toV2() {
    const MIGRATION_KEY = 'pseudoshield_migration_done';
    const result = await chrome.storage.local.get(MIGRATION_KEY);

    if (result[MIGRATION_KEY]) return; // Deja migre

    console.log('[PseudoShield] Migration v1 → v2 en cours...');

    const v1Keys = [
      'anonymizator_enabled',
      'anonymizator_whitelist',
      'anonymizator_allSites',
      'anonymizator_table',
      'anonymizator_counters',
      'anonymizator_journal',
      'anonymizator_disabled_patterns'
    ];

    const v1Data = await chrome.storage.local.get(v1Keys);
    const v2Data = {};
    let migrated = 0;

    // Copier chaque cle v1 vers son equivalent v2
    const keyMap = {
      'anonymizator_enabled': 'pseudoshield_enabled',
      'anonymizator_whitelist': 'pseudoshield_whitelist',
      'anonymizator_allSites': 'pseudoshield_allSites',
      'anonymizator_table': 'pseudoshield_table',
      'anonymizator_counters': 'pseudoshield_counters',
      'anonymizator_journal': 'pseudoshield_journal',
      'anonymizator_disabled_patterns': 'pseudoshield_disabled_patterns'
    };

    for (const [oldKey, newKey] of Object.entries(keyMap)) {
      if (v1Data[oldKey] !== undefined) {
        v2Data[newKey] = v1Data[oldKey];
        migrated++;
      }
    }

    if (migrated > 0) {
      v2Data[MIGRATION_KEY] = new Date().toISOString();
      await chrome.storage.local.set(v2Data);
      console.log('[PseudoShield] Migration terminee :', migrated, 'cles migrees');

      // Programmer la suppression des anciennes cles dans 30 jours
      // Note : les anciennes cles sont conservees pour rollback eventuel
      chrome.alarms?.create('pseudoshield_cleanup_v1', { delayInMinutes: 30 * 24 * 60 });
    } else {
      // Pas de donnees v1, marquer comme migre
      await chrome.storage.local.set({ [MIGRATION_KEY]: new Date().toISOString() });
      console.log('[PseudoShield] Aucune donnee v1 a migrer');
    }
  }

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      // Nouvelle installation
      chrome.storage.local.set({
        pseudoshield_enabled: true,
        pseudoshield_whitelist: [
          'claude.ai',
          'chatgpt.com',
          'gemini.google.com',
          'copilot.microsoft.com',
          'chat.deepseek.com',
          'perplexity.ai'
        ],
        pseudoshield_allSites: false,
        pseudoshield_migration_done: new Date().toISOString()
      });
      console.log('[PseudoShield] Extension installee, configuration par defaut appliquee');
    } else if (details.reason === 'update') {
      // Mise a jour : lancer la migration v1 → v2
      migrateStorageV1toV2();
    }
  });

  // Nettoyage des anciennes cles v1 apres 30 jours
  chrome.alarms?.onAlarm?.addListener((alarm) => {
    if (alarm.name === 'pseudoshield_cleanup_v1') {
      chrome.storage.local.remove([
        'anonymizator_enabled',
        'anonymizator_whitelist',
        'anonymizator_allSites',
        'anonymizator_table',
        'anonymizator_counters',
        'anonymizator_journal',
        'anonymizator_disabled_patterns'
      ]);
      console.log('[PseudoShield] Anciennes cles v1 supprimees');
    }
  });

  console.log('[PseudoShield] Background service worker demarre');
})();
