// anonymizer/patterns-generic.js
// Patterns de détection génériques internationaux
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

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
      console.error('[Anonymizator] Erreur validation Luhn:', e);
      return false;
    }
  }

  // Civilités pour la détection de noms propres
  const CIVILITES = '(?:M\\.|Mme|Mlle|Maître|Maitre|Me|Mr|Mrs|Ms|Dr|Pr|Prof)';

  // Contextes précédant un nom
  const CONTEXTES_NOM = '(?:Nom|Prénom|Prenom|Client|Partie|Requérant|Requerant|Défendeur|Defendeur|Demandeur|Plaignant|Intimé|Intime|Appelant|Signataire|Représenté|Represente|Bénéficiaire|Beneficiaire|Destinataire|Expéditeur|Expediteur|Patient|Médecin|Medecin|Avocat|Notaire|Juge)';

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

    // 12. Numéro de sécurité sociale français
    {
      id: 'SECU_FR',
      label: 'Sécurité sociale française',
      category: 'identite',
      rgpdCategory: 'art9',
      confidence: 'high',
      regex: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
      pseudonymPrefix: 'Secu',
      enabled: true
    }
  ];

  window.Anonymizator.PatternsGeneric = PATTERNS_GENERIC;
  window.Anonymizator.Validators = Object.assign(
    window.Anonymizator.Validators || {},
    { validateLuhn }
  );
})();
