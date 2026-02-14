// anonymizer/storage-manager.js
// Gestionnaire de quota chrome.storage.local — surveillance, alerte, purge FIFO
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  // --- Constantes ---

  // Quota maximum chrome.storage.local (10 Mo par defaut pour les extensions MV3)
  const QUOTA_BYTES_TOTAL = 10485760; // 10 * 1024 * 1024

  // Seuils d'alerte et de nettoyage automatique
  const WARNING_THRESHOLD = 0.70;  // 70% — alerte console
  const CRITICAL_THRESHOLD = 0.80; // 80% — purge FIFO automatique

  // Retention minimale du journal (7 jours en millisecondes)
  const MIN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

  // Cle de stockage du journal RGPD (coherente avec rgpd-logger.js)
  const JOURNAL_KEY = 'pseudoshield_journal';

  // Prefixe pour les logs console
  const LOG_PREFIX = '[PseudoShield:Storage]';

  // --- Fonctions internes ---

  /**
   * Recupere le nombre d'octets utilises dans chrome.storage.local
   * @returns {Promise<number>} Octets utilises
   */
  async function getBytesInUse() {
    try {
      const bytesUsed = await chrome.storage.local.getBytesInUse(null);
      return bytesUsed;
    } catch (e) {
      console.error(LOG_PREFIX, 'Erreur lecture quota:', e);
      return 0;
    }
  }

  /**
   * Verifie le quota actuel et retourne un objet de diagnostic
   * @returns {Promise<QuotaInfo>} Informations de quota
   */
  async function checkQuota() {
    const bytesUsed = await getBytesInUse();
    const percentUsed = bytesUsed / QUOTA_BYTES_TOTAL;
    const isWarning = percentUsed >= WARNING_THRESHOLD;
    const isCritical = percentUsed >= CRITICAL_THRESHOLD;

    // Alerte console au seuil de 70%
    if (isWarning && !isCritical) {
      console.warn(
        LOG_PREFIX,
        `Attention : quota storage a ${(percentUsed * 100).toFixed(1)}%`,
        `(${formatBytes(bytesUsed)} / ${formatBytes(QUOTA_BYTES_TOTAL)})`
      );
    }

    // Alerte critique a 80%
    if (isCritical) {
      console.warn(
        LOG_PREFIX,
        `CRITIQUE : quota storage a ${(percentUsed * 100).toFixed(1)}%`,
        '— purge FIFO recommandee'
      );
    }

    return {
      bytesUsed,
      bytesTotal: QUOTA_BYTES_TOTAL,
      percentUsed: Math.round(percentUsed * 10000) / 100, // Arrondi a 2 decimales
      isWarning,
      isCritical
    };
  }

  /**
   * Wrapper securise pour chrome.storage.local.set()
   * Verifie le quota avant l'ecriture et gere les erreurs QUOTA_BYTES_PER_ITEM
   * @param {Object} data - Donnees a ecrire (cle/valeur)
   * @returns {Promise<{success: boolean, error?: string, quotaInfo: QuotaInfo}>}
   */
  async function safeSet(data) {
    // Verification pre-ecriture du quota
    const quotaInfo = await checkQuota();

    // Si critique, tenter un nettoyage automatique avant l'ecriture
    if (quotaInfo.isCritical) {
      console.warn(LOG_PREFIX, 'Quota critique — lancement purge FIFO avant ecriture');
      await autoCleanup();
    }

    try {
      await chrome.storage.local.set(data);
      return {
        success: true,
        quotaInfo: await checkQuota()
      };
    } catch (e) {
      // Gestion specifique de l'erreur de depassement par item
      // Chrome renvoie "QUOTA_BYTES_PER_ITEM quota exceeded" pour les items > 8192 octets
      const errorMessage = e.message || String(e);

      if (errorMessage.includes('QUOTA_BYTES_PER_ITEM') || errorMessage.includes('quota')) {
        console.error(
          LOG_PREFIX,
          'Depassement de quota storage:',
          errorMessage
        );

        // Tentative de nettoyage puis re-essai unique
        const cleaned = await autoCleanup();
        if (cleaned > 0) {
          try {
            await chrome.storage.local.set(data);
            console.log(LOG_PREFIX, 'Ecriture reussie apres purge FIFO');
            return {
              success: true,
              quotaInfo: await checkQuota()
            };
          } catch (retryError) {
            console.error(LOG_PREFIX, 'Echec ecriture meme apres purge:', retryError);
            return {
              success: false,
              error: 'quota_exceeded_after_cleanup',
              quotaInfo: await checkQuota()
            };
          }
        }

        return {
          success: false,
          error: 'quota_exceeded',
          quotaInfo: await checkQuota()
        };
      }

      // Erreur non liee au quota
      console.error(LOG_PREFIX, 'Erreur ecriture storage:', e);
      return {
        success: false,
        error: errorMessage,
        quotaInfo: quotaInfo
      };
    }
  }

  /**
   * Purge FIFO des entrees les plus anciennes du journal
   * Supprime les entrees les plus vieilles en respectant la retention minimale de 7 jours
   * Ne se declenche que si le quota depasse le seuil critique (80%)
   * @returns {Promise<number>} Nombre d'entrees supprimees
   */
  async function autoCleanup() {
    const quotaInfo = await checkQuota();

    // Pas de nettoyage necessaire sous le seuil critique
    if (!quotaInfo.isCritical) {
      return 0;
    }

    try {
      const result = await chrome.storage.local.get(JOURNAL_KEY);
      const journal = result[JOURNAL_KEY] || [];

      if (journal.length === 0) {
        console.log(LOG_PREFIX, 'Journal vide — aucune entree a purger');
        return 0;
      }

      // Date limite de retention (7 jours avant maintenant)
      const retentionCutoff = new Date(Date.now() - MIN_RETENTION_MS).toISOString();

      // Identifier les entrees purgables (plus anciennes que la retention minimale)
      // Le journal est ordonne chronologiquement (push dans rgpd-logger.js)
      const purgableCount = journal.filter(
        entry => entry.timestamp < retentionCutoff
      ).length;

      if (purgableCount === 0) {
        console.warn(
          LOG_PREFIX,
          'Quota critique mais toutes les entrees sont dans la fenetre de retention de 7 jours.',
          `${journal.length} entrees conservees.`
        );
        return 0;
      }

      // Purger par lots progressifs (25% des entrees purgables a chaque passage)
      // pour eviter de tout supprimer d'un coup
      const batchSize = Math.max(1, Math.ceil(purgableCount * 0.25));
      const purgedEntries = journal.slice(0, batchSize);
      const remainingEntries = journal.slice(batchSize);

      await chrome.storage.local.set({ [JOURNAL_KEY]: remainingEntries });

      console.log(
        LOG_PREFIX,
        `Purge FIFO : ${batchSize} entrees supprimees`,
        `(plus anciennes : ${purgedEntries[0].timestamp}`,
        `→ ${purgedEntries[purgedEntries.length - 1].timestamp})`,
        `| ${remainingEntries.length} entrees restantes`
      );

      // Verifier si le quota est redescendu sous le seuil apres purge
      const postCleanupQuota = await checkQuota();
      if (postCleanupQuota.isCritical) {
        console.warn(
          LOG_PREFIX,
          'Quota toujours critique apres purge partielle.',
          'Un nettoyage supplementaire sera necessaire.'
        );
      }

      return batchSize;
    } catch (e) {
      console.error(LOG_PREFIX, 'Erreur durant la purge FIFO:', e);
      return 0;
    }
  }

  /**
   * Retourne des statistiques detaillees d'utilisation du storage
   * @returns {Promise<UsageStats>}
   */
  async function getUsageStats() {
    const quotaInfo = await checkQuota();

    // Mesurer l'espace utilise par le journal specifiquement
    let journalBytesUsed = 0;
    let journalEntriesCount = 0;
    let oldestEntry = null;
    let newestEntry = null;

    try {
      journalBytesUsed = await chrome.storage.local.getBytesInUse(JOURNAL_KEY);

      const result = await chrome.storage.local.get(JOURNAL_KEY);
      const journal = result[JOURNAL_KEY] || [];
      journalEntriesCount = journal.length;

      if (journal.length > 0) {
        oldestEntry = journal[0].timestamp;
        newestEntry = journal[journal.length - 1].timestamp;
      }
    } catch (e) {
      console.error(LOG_PREFIX, 'Erreur lecture stats journal:', e);
    }

    // Calcul de l'espace utilise par les autres donnees (table pseudonymes, config, etc.)
    const otherBytesUsed = quotaInfo.bytesUsed - journalBytesUsed;

    return {
      // Quota global
      totalBytesUsed: quotaInfo.bytesUsed,
      totalBytesTotal: quotaInfo.bytesTotal,
      totalPercentUsed: quotaInfo.percentUsed,
      totalBytesRemaining: quotaInfo.bytesTotal - quotaInfo.bytesUsed,
      isWarning: quotaInfo.isWarning,
      isCritical: quotaInfo.isCritical,

      // Journal RGPD
      journalBytesUsed,
      journalPercentOfTotal: Math.round((journalBytesUsed / quotaInfo.bytesTotal) * 10000) / 100,
      journalEntriesCount,
      journalOldestEntry: oldestEntry,
      journalNewestEntry: newestEntry,

      // Autres donnees (pseudonymes, configuration, etc.)
      otherBytesUsed,
      otherPercentOfTotal: Math.round((otherBytesUsed / quotaInfo.bytesTotal) * 10000) / 100,

      // Seuils de reference
      warningThresholdBytes: Math.round(QUOTA_BYTES_TOTAL * WARNING_THRESHOLD),
      criticalThresholdBytes: Math.round(QUOTA_BYTES_TOTAL * CRITICAL_THRESHOLD),

      // Metadonnees
      checkedAt: new Date().toISOString()
    };
  }

  // --- Utilitaires ---

  /**
   * Formate un nombre d'octets en chaine lisible (Ko, Mo)
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1048576).toFixed(2) + ' Mo';
  }

  // --- API publique ---

  window.PseudoShield.StorageManager = {
    checkQuota,
    safeSet,
    autoCleanup,
    getUsageStats
  };
})();
