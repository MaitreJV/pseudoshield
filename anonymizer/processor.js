// anonymizer/processor.js
// Pipeline principal : texte brut → détection → remplacement → résultat
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Traite un texte : détecte et remplace les données personnelles
   * @param {string} text - Texte brut à anonymiser
   * @param {Object} [options] - Options de traitement
   * @returns {Promise<ProcessResult>} Résultat du traitement
   */
  async function process(text, options = {}) {
    const startTime = performance.now();

    if (!text || typeof text !== 'string') {
      return {
        pseudonymizedText: text || '',
        originalTextLength: (text || '').length,
        replacementsCount: 0,
        detections: [],
        rgpdCategories: { art4: 0, art9: 0 },
        categoryCounts: {},
        processingTimeMs: 0
      };
    }

    // Étape 1 : Détection
    const detections = window.PseudoShield.Detector.detect(text, options);

    if (detections.length === 0) {
      return {
        pseudonymizedText: text,
        originalTextLength: text.length,
        replacementsCount: 0,
        detections: [],
        rgpdCategories: { art4: 0, art9: 0 },
        categoryCounts: {},
        processingTimeMs: performance.now() - startTime
      };
    }

    // Étape 2 : Pseudonymisation (remplacer de la fin vers le début pour conserver les positions)
    let pseudonymizedText = text;
    const processedDetections = [];

    for (let i = detections.length - 1; i >= 0; i--) {
      const detection = detections[i];

      const pseudonym = await window.PseudoShield.PseudonymEngine.getPseudonym(
        detection.match,
        detection.pseudonymPrefix,
        detection.category,
        detection.rgpdCategory
      );

      pseudonymizedText =
        pseudonymizedText.substring(0, detection.start) +
        '[' + pseudonym + ']' +
        pseudonymizedText.substring(detection.end);

      processedDetections.unshift({
        ...detection,
        pseudonym
      });
    }

    // Étape 3 : Compteurs
    const rgpdCategories = window.PseudoShield.Detector.countByRgpdCategory(detections);
    const categoryCounts = window.PseudoShield.Detector.countByCategory(detections);
    const processingTimeMs = performance.now() - startTime;

    return {
      pseudonymizedText,
      originalTextLength: text.length,
      replacementsCount: detections.length,
      detections: processedDetections,
      rgpdCategories,
      categoryCounts,
      processingTimeMs
    };
  }

  window.PseudoShield.Processor = { process };
})();
