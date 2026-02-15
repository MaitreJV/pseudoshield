// anonymizer/patterns-generic.js
// Patterns de détection génériques internationaux
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  /**
   * Validation Luhn pour cartes bancaires
   * @param {string} match - Numéro de carte détecté
   * @returns {boolean} true si le numéro est valide
   */
  function validateLuhn(match) {
    try {
      const clean = match.replace(/[\s\-]/g, '');
      if (!/^\d{13,19}$/.test(clean)) return false;

      let sum = 0;
      let alternate = false;

      for (let i = clean.length - 1; i >= 0; i--) {
        let n = parseInt(clean[i], 10);
        if (alternate) {
          n *= 2;
          if (n > 9) n -= 9;
        }
        sum += n;
        alternate = !alternate;
      }

      return sum % 10 === 0;
    } catch (e) {
      console.error('[PseudoShield] Erreur validation Luhn:', e);
      return false;
    }
  }

  /**
   * Validation modulo 97 pour le numéro de sécurité sociale français
   * Clé = 97 - (13 premiers chiffres % 97)
   * @param {string} match - Numéro sécu détecté
   * @returns {boolean} true si le numéro est valide
   */
  function validateSecuFR(match) {
    try {
      const clean = match.replace(/\s/g, '');
      if (clean.length !== 15) return false;

      // Valider le sexe (1 ou 2)
      if (clean[0] !== '1' && clean[0] !== '2') return false;

      // Valider le mois (01-12 ou 20 pour la Corse)
      const month = parseInt(clean.substring(3, 5), 10);
      if (month < 1 || (month > 12 && month !== 20)) return false;

      const base = parseInt(clean.substring(0, 13), 10);
      const key = parseInt(clean.substring(13, 15), 10);

      return (97 - (base % 97)) === key;
    } catch (e) {
      console.error('[PseudoShield] Erreur validation SECU_FR:', e);
      return false;
    }
  }

  // Civilités pour la détection de noms propres (avec point optionnel pour Dr./Pr./Prof.)
  const CIVILITES = '(?:Monsieur|Madame|Mademoiselle|M\\.|Mme|Mlle|Maître|Maitre|Me|Mr\\.?|Mrs\\.?|Ms\\.?|Dr\\.?|Pr\\.?|Prof\\.?)';

  // Contextes simples précédant un nom (un seul mot)
  const CONTEXTES_NOM = '(?:Nom|Prénom|Prenom|Client|Partie|Requérant|Requerant|Défendeur|Defendeur|Demandeur|Plaignant|Intimé|Intime|Appelant|Signataire|Représenté|Represente|Bénéficiaire|Beneficiaire|Destinataire|Expéditeur|Expediteur|Patient|Médecin|Medecin|Avocat|Notaire|Juge|soussigné|soussignée|soussigne|dénommé|dénommée|denomme|Cher|Chère|Chere)';

  // Contextes multi-mots précédant un nom
  const CONTEXTES_MULTI = '(?:représenté(?:e)?\\s+par|represente(?:e)?\\s+par|ci-après(?:\\s+(?:dénommé|dénommée|denomme))?|ci-apres(?:\\s+(?:denomme))?)';

  // Particules de noms belges/français/néerlandais
  const PARTICULES = "(?:Van\\s+den|Van\\s+de|Van\\s+der|Van't|Van|Den|De\\s+la|De\\s+le|Du|De|Le|La|D')";

  const PATTERNS_GENERIC = [
    // 1. Emails
    {
      id: 'EMAIL',
      label: 'Adresse email',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
      pseudonymPrefix: 'Email',
      enabled: true
    },

    // 2. Téléphones belges
    {
      id: 'TEL_BE',
      label: 'Téléphone belge',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /(?:\+32|0032)[\s.]?\(?\d{1,3}\)?[\s./\-]?\d{2}[\s./\-]?\d{2}[\s./\-]?\d{2}\b/g,
      pseudonymPrefix: 'Tel',
      enabled: true
    },

    // 3. Téléphones belges format local
    {
      id: 'TEL_BE_LOCAL',
      label: 'Téléphone belge (local)',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b0\d{1,3}[\s./\-]\d{2,3}[\s./\-]?\d{2}[\s./\-]?\d{2}\b/g,
      pseudonymPrefix: 'Tel',
      enabled: true
    },

    // 4. Téléphones français
    {
      id: 'TEL_FR',
      label: 'Téléphone français',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /(?:\+33|0033)[\s.]?\(?\d{1}\)?[\s./\-]?\d{2}[\s./\-]?\d{2}[\s./\-]?\d{2}[\s./\-]?\d{2}\b/g,
      pseudonymPrefix: 'Tel',
      enabled: true
    },

    // 5. Téléphones internationaux
    {
      id: 'TEL_INT',
      label: 'Téléphone international',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}\b/g,
      pseudonymPrefix: 'Tel',
      enabled: true
    },

    // 6. Dates de naissance (formats EU)
    {
      id: 'DATE_NAISSANCE',
      label: 'Date de naissance',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /\b(?:0[1-9]|[12]\d|3[01])[\/.\-](?:0[1-9]|1[0-2])[\/.\-](?:19|20)\d{2}\b/g,
      pseudonymPrefix: 'Date',
      enabled: true
    },

    // 7. Adresses IPv4
    {
      id: 'IPV4',
      label: 'Adresse IPv4',
      category: 'technique',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
      pseudonymPrefix: 'IP',
      enabled: true
    },

    // 8. Adresses IPv6
    {
      id: 'IPV6',
      label: 'Adresse IPv6',
      category: 'technique',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
      pseudonymPrefix: 'IP',
      enabled: true
    },

    // 9. Cartes bancaires (Visa, Mastercard, Amex)
    {
      id: 'CB',
      label: 'Carte bancaire',
      category: 'financier',
      rgpdCategory: 'art4',
      confidence: 'high',
      regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2})[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,4}\b/g,
      validator: validateLuhn,
      pseudonymPrefix: 'CB',
      enabled: true
    },

    // 10. Noms propres après civilité
    {
      id: 'NOM_CIVILITE',
      label: 'Nom propre (civilité)',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: new RegExp(CIVILITES + '\\s+(?:' + PARTICULES + '\\s+)?([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\\s\\-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)', 'g'),
      pseudonymPrefix: 'Personne',
      enabled: true
    },

    // 11. Noms propres après contexte juridique
    {
      id: 'NOM_CONTEXTE',
      label: 'Nom propre (contexte)',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: new RegExp(CONTEXTES_NOM + '\\s*:?\\s+(?:' + PARTICULES + '\\s+)?([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\\s\\-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)', 'g'),
      pseudonymPrefix: 'Personne',
      enabled: true
    },

    // 12. Noms propres après contexte multi-mots (représenté par, ci-après dénommé)
    {
      id: 'NOM_MULTICONTEXTE',
      label: 'Nom propre (contexte multi-mots)',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: new RegExp(CONTEXTES_MULTI + '\\s+(?:' + PARTICULES + '\\s+)?([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\\s\\-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)', 'g'),
      pseudonymPrefix: 'Personne',
      enabled: true
    },

    // 13. Noms propres heuristiques : Prénom Nom consécutifs, pas en début de phrase
    // Lookbehind : précédé d'un saut de ligne, ponctuation, ou fin de mot en minuscule
    // confidenceAdjuster : rejette les faux positifs (expressions institutionnelles),
    // boost la confiance si le premier mot est un prénom connu
    {
      id: 'NOM_CONSECUTIF',
      label: 'Nom propre (heuristique)',
      category: 'identite',
      rgpdCategory: 'art4',
      confidence: 'low',
      regex: new RegExp(
        '(?<=[\\n,;:(]\\s*|[a-zà-ÿ]\\s)' +
        '[A-ZÀ-Ÿ][a-zà-ÿ]{2,}(?:-[A-ZÀ-Ÿ][a-zà-ÿ]+)?' +
        '\\s+' +
        '(?:' + PARTICULES + '\\s+)?' +
        '[A-ZÀ-Ÿ][a-zà-ÿ]{2,}',
        'g'
      ),
      confidenceAdjuster: function(matchText) {
        var fp = window.PseudoShield.Data && window.PseudoShield.Data.FalsePositiveBigrams;
        var names = window.PseudoShield.Data && window.PseudoShield.Data.FirstNames;

        // 1. Rejet si faux positif connu (expression institutionnelle)
        // Normaliser : retirer les accents pour comparaison avec le Set (sans accents)
        var normalized = matchText.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (fp && fp.has(normalized)) return null;

        // 2. Extraire les mots capitalisés et rejeter si un mot > 15 caractères
        var words = matchText.split(/\s+/).filter(function(w) { return /^[A-ZÀ-Ÿ]/.test(w); });
        if (words.some(function(w) { return w.length > 15; })) return null;

        // 3. Boost si le premier mot est un prénom connu → low → medium
        if (names && words.length > 0) {
          var firstName = words[0].toLowerCase();
          if (names.has(firstName)) return 'medium';
        }

        return 'low';
      },
      pseudonymPrefix: 'Personne',
      enabled: true
    },

    // 14. Numéro de sécurité sociale français
    {
      id: 'SECU_FR',
      label: 'Sécurité sociale française',
      category: 'identite',
      rgpdCategory: 'art9',
      confidence: 'high',
      regex: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
      validator: validateSecuFR,
      pseudonymPrefix: 'Secu',
      enabled: true
    }
  ];

  window.PseudoShield.PatternsGeneric = PATTERNS_GENERIC;
  window.PseudoShield.Validators = Object.assign(
    window.PseudoShield.Validators || {},
    { validateLuhn, validateSecuFR }
  );
})();
