// anonymizer/patterns-eu.js
// Patterns de détection spécifiques EU/BE/FR/LU
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Validation modulo 97 pour le NISS belge
   * @param {string} match - Numéro NISS détecté
   * @returns {boolean} true si le NISS est valide
   */
  function validateNISS(match) {
    try {
      const clean = match.replace(/[.\-\s]/g, '');
      if (clean.length !== 11) return false;

      const birthPart = clean.substring(0, 9);
      const checkDigits = parseInt(clean.substring(9, 11), 10);

      // Essai post-2000 : préfixer par 2
      const numPost2000 = parseInt('2' + birthPart, 10);
      if (97 - (numPost2000 % 97) === checkDigits) return true;

      // Essai pré-2000
      const numPre2000 = parseInt(birthPart, 10);
      if (97 - (numPre2000 % 97) === checkDigits) return true;

      return false;
    } catch (e) {
      console.error('[PseudoShield] Erreur validation NISS:', e);
      return false;
    }
  }

  /**
   * Validation modulo 97 pour le numéro INAMI belge
   * Format : X-XXXXX-XX-XXX (11 chiffres)
   * Checksum : les chiffres 7-8 = base (6 premiers chiffres) modulo 97
   * @param {string} match - Numéro INAMI détecté
   * @returns {boolean} true si le numéro INAMI est valide
   */
  function validateINAMI(match) {
    try {
      const clean = match.replace(/[\-\s]/g, '');
      if (clean.length !== 11) return false;

      const base = parseInt(clean.substring(0, 6), 10);
      const check = parseInt(clean.substring(6, 8), 10);

      // Deux variantes de checksum connues
      return (base % 97) === check || (97 - (base % 97)) === check;
    } catch (e) {
      console.error('[PseudoShield] Erreur validation INAMI:', e);
      return false;
    }
  }

  /**
   * Validation IBAN via modulo 97-10 (ISO 13616)
   * @param {string} match - IBAN détecté
   * @returns {boolean} true si l'IBAN est valide
   */
  function validateIBAN(match) {
    try {
      const clean = match.replace(/[\s.\-]/g, '').toUpperCase();
      if (clean.length < 15 || clean.length > 34) return false;

      const rearranged = clean.substring(4) + clean.substring(0, 4);

      let numStr = '';
      for (const char of rearranged) {
        if (char >= 'A' && char <= 'Z') {
          numStr += (char.charCodeAt(0) - 55).toString();
        } else {
          numStr += char;
        }
      }

      let remainder = 0;
      for (let i = 0; i < numStr.length; i++) {
        remainder = parseInt(remainder.toString() + numStr[i], 10) % 97;
      }

      return remainder === 1;
    } catch (e) {
      console.error('[PseudoShield] Erreur validation IBAN:', e);
      return false;
    }
  }

  const PATTERNS_EU = [
    // 1. Registre national belge (NISS)
    // softValidation : si le modulo 97 échoue, on garde le match en 'medium'
    // plutôt que de l'ignorer — mieux vaut un faux positif qu'un faux négatif
    {
      id: 'NISS_BE',
      label: 'Registre national belge',
      category: 'identite',
      rgpdCategory: 'art9',
      confidence: 'high',
      regex: /\b(\d{2})[.\s]?(\d{2})[.\s]?(\d{2})[.\s-]?(\d{3})[.\s]?(\d{2})\b/g,
      validator: validateNISS,
      softValidation: true,
      pseudonymPrefix: 'NISS',
      enabled: true
    },

    // 2. IBAN belge
    {
      id: 'IBAN_BE',
      label: 'IBAN belge',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bBE\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 3. IBAN français
    {
      id: 'IBAN_FR',
      label: 'IBAN français',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bFR\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{3}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 4. IBAN luxembourgeois
    {
      id: 'IBAN_LU',
      label: 'IBAN luxembourgeois',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bLU\d{2}[\s.\-]?\d{3}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{1}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 5. IBAN allemand
    {
      id: 'IBAN_DE',
      label: 'IBAN allemand',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bDE\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{2}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 6. IBAN néerlandais
    {
      id: 'IBAN_NL',
      label: 'IBAN néerlandais',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bNL\d{2}[\s.\-]?[A-Z]{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{2}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 7. IBAN italien
    {
      id: 'IBAN_IT',
      label: 'IBAN italien',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bIT\d{2}[\s.\-]?[A-Z]\d{3}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{3}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 8. IBAN espagnol
    {
      id: 'IBAN_ES',
      label: 'IBAN espagnol',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bES\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}\b/gi,
      validator: validateIBAN,
      pseudonymPrefix: 'IBAN',
      enabled: true
    },

    // 9. TVA belge
    {
      id: 'TVA_BE',
      label: 'TVA belge',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bBE[\s]?0\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/gi,
      pseudonymPrefix: 'TVA',
      enabled: true
    },

    // 10. TVA française
    {
      id: 'TVA_FR',
      label: 'TVA française',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bFR[\s]?\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3}\b/gi,
      pseudonymPrefix: 'TVA',
      enabled: true
    },

    // 11. TVA luxembourgeoise
    {
      id: 'TVA_LU',
      label: 'TVA luxembourgeoise',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bLU[\s]?\d{8}\b/gi,
      pseudonymPrefix: 'TVA',
      enabled: true
    },

    // 12. Adresses postales belges/françaises
    {
      id: 'ADRESSE_EU',
      label: 'Adresse postale EU',
      category: 'adresse',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /(?:(?:rue|avenue|boulevard|chaussée|chaussee|place|allée|allee|chemin|impasse|passage|square|quai|route)\s+[\w\sÀ-ÿ''-]+(?:,?\s*\d{1,4}\s*[a-zA-Z]?)?\s*,?\s*\d{4,5}\s+[\wÀ-ÿ\s''-]+)/gi,
      pseudonymPrefix: 'Adresse',
      enabled: true
    },

    // 13. Numéro carte identité belge
    {
      id: 'CI_BE',
      label: 'Carte identité belge',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b\d{3}-\d{7}-\d{2}\b/g,
      pseudonymPrefix: 'CI',
      enabled: true
    },

    // 14. Numéro BCE
    {
      id: 'BCE_BE',
      label: 'BCE (Banque Carrefour Entreprises)',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /(?:BCE|banque[\s-]?carrefour|entreprise|n°[\s]?d'entreprise)\s*:?\s*(0\d{3}[.\s]?\d{3}[.\s]?\d{3})\b/gi,
      pseudonymPrefix: 'BCE',
      enabled: true
    },

    // 15. Plaque immatriculation belge
    {
      id: 'PLAQUE_BE',
      label: 'Plaque immatriculation belge',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /\b[12]-[A-Z]{3}-\d{3}\b/gi,
      pseudonymPrefix: 'Plaque',
      enabled: true
    },

    // 16. Passeport belge (série EH ou EI + 6 chiffres)
    {
      id: 'PASSPORT_BE',
      label: 'Passeport belge',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\bE[HI]\d{6}\b/g,
      pseudonymPrefix: 'Passeport',
      enabled: true
    },

    // 17. Passeport français (2 chiffres + 2 lettres + 5 chiffres)
    {
      id: 'PASSPORT_FR',
      label: 'Passeport français',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b\d{2}[A-Z]{2}\d{5}\b/g,
      pseudonymPrefix: 'Passeport',
      enabled: true
    },

    // 18. Numéro INAMI (médecin/praticien belge)
    // Format : X-XXXXX-XX-XXX avec modulo 97 sur les 6 premiers chiffres
    {
      id: 'INAMI_BE',
      label: 'Numéro INAMI',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b[1-9]-?\d{5}-?\d{2}-?\d{3}\b/g,
      validator: validateINAMI,
      pseudonymPrefix: 'INAMI',
      enabled: true
    }
  ];

  window.PseudoShield.PatternsEU = PATTERNS_EU;
  window.PseudoShield.Validators = { validateNISS, validateIBAN, validateINAMI };
})();
