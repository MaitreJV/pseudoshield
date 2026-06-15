// background.js
// Service worker : etat global, messages inter-composants, badge compteur, et
// enregistrement dynamique du content script sur les sites ajoutes par l'utilisateur.
// Art. 4(5) RGPD — pseudonymisation (pas anonymisation)
(function() {
  'use strict';

  // Categories valides pour filtrer les messages entrants
  const VALID_CATEGORIES = new Set(['identite', 'contact', 'financier', 'adresse', 'technique']);

  // Domaines couverts STATIQUEMENT par le manifest (content_scripts). Ils ne doivent
  // JAMAIS etre enregistres dynamiquement, sous peine de double injection.
  const STATIC_DOMAINS = [
    'claude.ai',
    'chatgpt.com',
    'gemini.google.com',
    'copilot.microsoft.com',
    'chat.deepseek.com',
    'perplexity.ai'
  ];

  // Bundle du content script — DOIT refleter exactement l'ordre du manifest
  // (content_scripts[0].js). Sert a l'injection dynamique sur les domaines custom.
  const CONTENT_JS = [
    'utils/hash.js',
    'utils/debounce.js',
    'data/false-positive-bigrams.js',
    'data/first-names-be-fr.js',
    'anonymizer/patterns-eu.js',
    'anonymizer/patterns-generic.js',
    'anonymizer/patterns-digital.js',
    'anonymizer/detector.js',
    'anonymizer/storage-manager.js',
    'anonymizer/pseudonym-engine.js',
    'anonymizer/processor.js',
    'anonymizer/rgpd-logger.js',
    'utils/clipboard.js',
    'adapters/cursor-manager.js',
    'adapters/adapter-generic.js',
    'adapters/adapter-registry.js',
    'adapters/adapter-prosemirror.js',
    'adapters/adapter-textarea.js',
    'adapters/adapter-quill.js',
    'utils/site-adapters.js',
    'ui/toast.js',
    'content.js'
  ];
  const CONTENT_CSS = ['ui/toast.css'];

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

  // Helper : fusionner les categoryCounts avec validation
  function mergeCategoryCounts(categoryCounts) {
    if (!categoryCounts || typeof categoryCounts !== 'object') return;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      // Accepter uniquement les categories connues pour prevenir l'injection
      if (!VALID_CATEGORIES.has(cat)) continue;
      const safeCount = parseInt(count, 10);
      if (isNaN(safeCount) || safeCount < 0) continue;
      sessionStats.categoryCounts[cat] = (sessionStats.categoryCounts[cat] || 0) + safeCount;
    }
  }

  // ─── Enregistrement dynamique du content script (sites custom) ─────────────

  // Identifiant de script stable derive du domaine.
  function scriptIdForDomain(domain) {
    return 'pseudoshield-' + domain.replace(/[^a-z0-9.-]/gi, '_');
  }

  // Patterns d'origine : le domaine lui-meme et ses sous-domaines.
  function originPatternsForDomain(domain) {
    return ['https://' + domain + '/*', 'https://*.' + domain + '/*'];
  }

  // Vrai si le domaine est deja couvert statiquement par le manifest (apex ou sous-domaine).
  // Empeche d'enregistrer dynamiquement un domaine statique (ex. www.perplexity.ai) -> double injection.
  function isStaticDomain(domain) {
    return STATIC_DOMAINS.some(s => domain === s || domain.endsWith('.' + s));
  }

  // Domaines custom = whitelist privee des domaines couverts statiquement.
  function customDomainsFrom(whitelist) {
    return (whitelist || []).filter(d => !isStaticDomain(d));
  }

  // Enregistre (idempotent) le content script pour un domaine custom.
  async function registerSiteScript(domain) {
    const id = scriptIdForDomain(domain);
    try { await chrome.scripting.unregisterContentScripts({ ids: [id] }); } catch (e) { /* pas encore enregistre */ }
    const spec = {
      id,
      matches: originPatternsForDomain(domain),
      js: CONTENT_JS,
      css: CONTENT_CSS,
      runAt: 'document_idle',
      persistAcrossSessions: true
    };
    try {
      await chrome.scripting.registerContentScripts([spec]);
    } catch (e) {
      // Firefox < 128 ne supporte pas persistAcrossSessions — reessayer sans le flag
      // (reconcileRegistrations re-enregistrera de toute facon au prochain demarrage).
      delete spec.persistAcrossSessions;
      await chrome.scripting.registerContentScripts([spec]);
    }
    console.log('[PseudoShield] Content script enregistre pour', domain);
  }

  // Desenregistre le content script d'un domaine + retire la permission host associee.
  async function unregisterSiteScript(domain) {
    const id = scriptIdForDomain(domain);
    try { await chrome.scripting.unregisterContentScripts({ ids: [id] }); } catch (e) { /* deja absent */ }
    try { await chrome.permissions.remove({ origins: originPatternsForDomain(domain) }); } catch (e) { /* best-effort */ }
    console.log('[PseudoShield] Content script desenregistre pour', domain);
  }

  // Injecte le bundle dans les onglets DEJA ouverts (registerContentScripts ne
  // couvre que les navigations futures).
  async function injectIntoOpenTabs(domain) {
    try {
      const tabs = await chrome.tabs.query({ url: originPatternsForDomain(domain) });
      for (const tab of tabs) {
        if (!tab.id) continue;
        try {
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: CONTENT_CSS });
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_JS });
        } catch (e) { /* onglet protege ou non charge — ignorer */ }
      }
    } catch (e) {
      console.warn('[PseudoShield] injectIntoOpenTabs echoue pour', domain, e);
    }
  }

  // Reconcilie l'etat au demarrage : (re)enregistre les domaines custom autorises,
  // met en attente ceux sans permission (migration users v2.0.0), purge les orphelins.
  async function reconcileRegistrations() {
    if (!chrome.scripting) return;
    try {
      const store = await chrome.storage.local.get('pseudoshield_whitelist');
      // Storage pas encore initialise : ne rien reconcilier (sinon on purgerait des scripts legitimes).
      if (store.pseudoshield_whitelist === undefined) return;
      const custom = customDomainsFrom(store.pseudoshield_whitelist);
      const registered = await chrome.scripting.getRegisteredContentScripts();
      const registeredIds = new Set(registered.map(s => s.id));
      const pending = [];

      for (const domain of custom) {
        try {
          const id = scriptIdForDomain(domain);
          const hasPerm = await chrome.permissions.contains({ origins: originPatternsForDomain(domain) });
          if (hasPerm) {
            if (!registeredIds.has(id)) await registerSiteScript(domain);
          } else {
            // Permission absente -> en attente (ne pas enregistrer, ne pas retirer de la whitelist).
            pending.push(domain);
            if (registeredIds.has(id)) {
              try { await chrome.scripting.unregisterContentScripts({ ids: [id] }); } catch (e) { /* ignore */ }
            }
          }
        } catch (e) {
          // Un domaine malforme ne doit pas bloquer la reconciliation des autres.
          console.warn('[PseudoShield] reconcile: domaine ignore', domain, e);
        }
      }

      // Purger les scripts pseudoshield-* dont le domaine n'est plus dans la whitelist.
      for (const s of registered) {
        if (!s.id.startsWith('pseudoshield-')) continue;
        if (!custom.some(d => scriptIdForDomain(d) === s.id)) {
          try { await chrome.scripting.unregisterContentScripts({ ids: [s.id] }); } catch (e) { /* ignore */ }
        }
      }

      await chrome.storage.local.set({ pseudoshield_pending_permissions: pending });
    } catch (e) {
      console.error('[PseudoShield] reconcileRegistrations echoue:', e);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Validation sender : un message de confiance vient d'une PAGE de l'extension
    // (popup ou options), identifiee par son URL chrome-extension://<id>/...
    // NB: la page options ouverte dans un onglet a un sender.tab DEFINI -> l'ancien
    // test "!sender.tab" la rejetait a tort (cause du "Non autorise" sur registerSite).
    const isExtensionPage = typeof sender.url === 'string' &&
      sender.url.startsWith('chrome-extension://' + chrome.runtime.id + '/');

    switch (message.type) {
      case 'pseudonymization_done':
      case 'anonymization_done': {
        const count = parseInt(message.count || 0, 10);
        sessionCount += count;
        sessionStats.total += count;
        sessionStats.art4 += parseInt(message.rgpdCategories?.art4 || 0, 10);
        sessionStats.art9 += parseInt(message.rgpdCategories?.art9 || 0, 10);
        mergeCategoryCounts(message.categoryCounts);
        updateBadge(sessionCount);
        sendResponse({ ok: true });
        break;
      }

      case 'getSessionStats':
        sendResponse({ stats: sessionStats, count: sessionCount });
        break;

      case 'resetSession':
        // Seules les pages extension (popup, options) peuvent reset
        if (!isExtensionPage) {
          sendResponse({ error: 'Non autorise' });
          break;
        }
        sessionCount = 0;
        sessionStats = { total: 0, art4: 0, art9: 0, categoryCounts: {} };
        updateBadge(0);
        sendResponse({ ok: true });
        break;

      case 'toggle':
        // Seules les pages extension (popup, options) peuvent toggle
        if (!isExtensionPage) {
          sendResponse({ error: 'Non autorise' });
          break;
        }
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            try {
              chrome.tabs.sendMessage(tab.id, { type: 'toggle', enabled: !!message.enabled });
            } catch (e) {
              // Certains onglets peuvent ne pas avoir le content script
            }
          }
        });

        chrome.storage.local.set({ pseudoshield_enabled: !!message.enabled });

        chrome.action.setBadgeBackgroundColor({
          color: message.enabled ? '#00b894' : '#666666'
        });

        sendResponse({ ok: true });
        break;

      case 'registerSite': {
        // Enregistre un domaine custom. La permission host DOIT avoir ete accordee
        // cote options (geste utilisateur) AVANT cet appel.
        if (!isExtensionPage) { sendResponse({ error: 'Non autorise' }); break; }
        const domainToAdd = typeof message.domain === 'string' ? message.domain.trim().toLowerCase() : '';
        if (!domainToAdd || isStaticDomain(domainToAdd)) {
          sendResponse({ error: 'Domaine invalide' });
          break;
        }
        (async () => {
          try {
            const hasPerm = await chrome.permissions.contains({ origins: originPatternsForDomain(domainToAdd) });
            if (!hasPerm) { sendResponse({ error: 'Permission non accordee' }); return; }
            await registerSiteScript(domainToAdd);
            await injectIntoOpenTabs(domainToAdd);
            sendResponse({ ok: true });
          } catch (e) {
            console.error('[PseudoShield] registerSite echoue:', e);
            sendResponse({ error: 'Echec enregistrement' });
          }
        })();
        break; // sendResponse asynchrone — le canal reste ouvert via le return true final
      }

      case 'unregisterSite': {
        if (!isExtensionPage) { sendResponse({ error: 'Non autorise' }); break; }
        const domainToRemove = typeof message.domain === 'string' ? message.domain.trim().toLowerCase() : '';
        if (!domainToRemove) { sendResponse({ error: 'Domaine invalide' }); break; }
        (async () => {
          try {
            await unregisterSiteScript(domainToRemove);
            sendResponse({ ok: true });
          } catch (e) {
            console.error('[PseudoShield] unregisterSite echoue:', e);
            sendResponse({ error: 'Echec desenregistrement' });
          }
        })();
        break; // sendResponse asynchrone
      }

      default:
        sendResponse({ error: 'Type de message inconnu' });
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

    // Re-valider la whitelist migree : une entree v1 malformee ne doit pas etre injectee telle quelle.
    if (Array.isArray(v2Data['pseudoshield_whitelist'])) {
      v2Data['pseudoshield_whitelist'] = v2Data['pseudoshield_whitelist'].filter(d =>
        typeof d === 'string' && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(d)
      );
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

  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      // Nouvelle installation
      await chrome.storage.local.set({
        pseudoshield_enabled: true,
        pseudoshield_whitelist: STATIC_DOMAINS.slice(),
        pseudoshield_migration_done: new Date().toISOString()
      });
      console.log('[PseudoShield] Extension installee, configuration par defaut appliquee');
    } else if (details.reason === 'update') {
      // Mise a jour : migration v1 → v2 AVANT la reconciliation (sinon reconcile lit un etat perime).
      await migrateStorageV1toV2();
    }
    // Reconcilier les enregistrements dynamiques (domaines custom autorises / en attente).
    await reconcileRegistrations();
  });

  // Au demarrage du navigateur : re-synchroniser les enregistrements dynamiques
  // (les content scripts persistent via persistAcrossSessions, mais la permission
  // peut avoir ete revoquee manuellement entre deux sessions).
  if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
      reconcileRegistrations();
    });
  }

  // Nettoyage des anciennes cles v1 apres 30 jours
  chrome.alarms?.onAlarm?.addListener((alarm) => {
    if (alarm.name === 'pseudoshield_cleanup_v1') {
      chrome.storage.local.remove([
        'anonymizator_enabled',
        'anonymizator_whitelist',
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
