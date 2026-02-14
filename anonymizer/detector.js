// anonymizer/detector.js
// Moteur de détection : orchestre les patterns et produit les matches
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  // Cache des regex compilées — évite de recréer 29 objets RegExp à chaque paste
  const compiledRegexCache = new Map();

  // Niveaux de confiance et scores associes pour le filtrage par seuil
  const CONFIDENCE_LEVELS = { high: 3, medium: 2, low: 1 };

  /**
   * Detecte toutes les donnees personnelles dans un texte
   * @param {string} text - Texte a analyser
   * @param {Object} [options] - Options de detection
   * @param {string[]} [options.enabledPatterns] - IDs des patterns a utiliser (tous par defaut)
   * @param {string} [options.confidenceThreshold] - Seuil minimum de confiance ('high', 'medium', 'low')
   * @returns {Detection[]} Liste des detections triees par position
   */
  function detect(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const allPatterns = [
      ...(window.PseudoShield.PatternsEU || []),
      ...(window.PseudoShield.PatternsGeneric || []),
      ...(window.PseudoShield.PatternsDigital || [])
    ];

    const enabledPatterns = allPatterns.filter(p => {
      if (!p.enabled) return false;
      if (options.enabledPatterns && !options.enabledPatterns.includes(p.id)) return false;
      return true;
    });

    const detections = [];

    for (const pattern of enabledPatterns) {
      // Recuperer la regex depuis le cache ou la compiler une seule fois
      let regex = compiledRegexCache.get(pattern.id);
      if (!regex) {
        regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        compiledRegexCache.set(pattern.id, regex);
      }
      regex.lastIndex = 0;

      let match;
      while ((match = regex.exec(text)) !== null) {
        const matchText = match[0];

        // Appliquer le validateur si defini
        let confidence = pattern.confidence;
        if (pattern.validator && !pattern.validator(matchText)) {
          if (pattern.softValidation) {
            // Validation souple : garder le match mais reduire la confiance
            confidence = 'medium';
          } else {
            continue;
          }
        }

        // Appliquer le confidenceAdjuster si defini
        // Retourne null pour rejeter, ou un niveau de confiance ajuste
        if (pattern.confidenceAdjuster) {
          const adjusted = pattern.confidenceAdjuster(matchText);
          if (adjusted === null) continue;
          confidence = adjusted;
        }

        detections.push({
          patternId: pattern.id,
          match: matchText,
          start: match.index,
          end: match.index + matchText.length,
          category: pattern.category,
          rgpdCategory: pattern.rgpdCategory,
          confidence,
          pseudonymPrefix: pattern.pseudonymPrefix
        });
      }
    }

    // Filtrer par seuil de confiance (defaut : 'low' = tout accepter)
    const threshold = options.confidenceThreshold || 'low';
    const thresholdScore = CONFIDENCE_LEVELS[threshold] || 1;

    const filtered = detections.filter(d =>
      (CONFIDENCE_LEVELS[d.confidence] || 0) >= thresholdScore
    );

    // Trier par position de debut
    filtered.sort((a, b) => a.start - b.start);

    // Resoudre les chevauchements
    return resolveOverlaps(filtered);
  }

  /**
   * Résout les chevauchements entre détections
   * Priorité : confiance haute > longueur du match > position
   * @param {Detection[]} detections - Détections triées par position
   * @returns {Detection[]} Détections sans chevauchement
   */
  function resolveOverlaps(detections) {
    if (detections.length <= 1) return detections;

    const CONFIDENCE_SCORE = { high: 3, medium: 2, low: 1 };
    const resolved = [detections[0]];

    for (let i = 1; i < detections.length; i++) {
      const current = detections[i];
      const last = resolved[resolved.length - 1];

      // Pas de chevauchement
      if (current.start >= last.end) {
        resolved.push(current);
        continue;
      }

      // Chevauchement : garder celui avec la meilleure confiance, puis le plus long
      const lastScore = CONFIDENCE_SCORE[last.confidence] || 0;
      const currentScore = CONFIDENCE_SCORE[current.confidence] || 0;

      if (currentScore > lastScore ||
          (currentScore === lastScore && (current.end - current.start) > (last.end - last.start))) {
        resolved[resolved.length - 1] = current;
      }
    }

    return resolved;
  }

  /**
   * Compte les détections par catégorie RGPD
   * @param {Detection[]} detections
   * @returns {{ art4: number, art9: number }}
   */
  function countByRgpdCategory(detections) {
    return detections.reduce((acc, d) => {
      if (d.rgpdCategory === 'art9') acc.art9++;
      else acc.art4++;
      return acc;
    }, { art4: 0, art9: 0 });
  }

  /**
   * Compte les détections par catégorie fonctionnelle
   * @param {Detection[]} detections
   * @returns {Object<string, number>}
   */
  function countByCategory(detections) {
    return detections.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {});
  }

  window.PseudoShield.Detector = {
    detect,
    countByRgpdCategory,
    countByCategory
  };
})();
