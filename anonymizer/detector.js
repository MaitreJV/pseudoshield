// anonymizer/detector.js
// Moteur de détection : orchestre les patterns et produit les matches
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  /**
   * Détecte toutes les données personnelles dans un texte
   * @param {string} text - Texte à analyser
   * @param {Object} [options] - Options de détection
   * @param {string[]} [options.enabledPatterns] - IDs des patterns à utiliser (tous par défaut)
   * @returns {Detection[]} Liste des détections triées par position
   */
  function detect(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const allPatterns = [
      ...(window.Anonymizator.PatternsEU || []),
      ...(window.Anonymizator.PatternsGeneric || [])
    ];

    const enabledPatterns = allPatterns.filter(p => {
      if (!p.enabled) return false;
      if (options.enabledPatterns && !options.enabledPatterns.includes(p.id)) return false;
      return true;
    });

    const detections = [];

    for (const pattern of enabledPatterns) {
      // Réinitialiser le lastIndex de la regex (flag 'g')
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

      let match;
      while ((match = regex.exec(text)) !== null) {
        const matchText = match[0];

        // Appliquer le validateur si défini
        let confidence = pattern.confidence;
        if (pattern.validator && !pattern.validator(matchText)) {
          if (pattern.softValidation) {
            // Validation souple : garder le match mais réduire la confiance
            confidence = 'medium';
          } else {
            continue;
          }
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

    // Trier par position de début
    detections.sort((a, b) => a.start - b.start);

    // Résoudre les chevauchements
    return resolveOverlaps(detections);
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

  window.Anonymizator.Detector = {
    detect,
    countByRgpdCategory,
    countByCategory
  };
})();
