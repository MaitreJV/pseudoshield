// anonymizer/patterns-digital.js
// Patterns de détection pour données numériques (GPS, URLs PII, handles sociaux)
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  const PATTERNS_DIGITAL = [
    // 1. Coordonnées GPS (latitude/longitude avec précision >= 4 décimales)
    // Latitude : -90 à 90, Longitude : -180 à 180
    // Nécessite au moins 4 décimales pour filtrer les nombres ordinaires
    {
      id: 'GPS_COORD',
      label: 'Coordonnées GPS',
      category: 'technique',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /\b-?(?:[1-8]?\d(?:\.\d{4,})|90(?:\.0+)?)\s*[,;]\s*-?(?:1[0-7]\d|0?\d{1,2})(?:\.\d{4,})\b/g,
      pseudonymPrefix: 'GPS',
      enabled: true
    },

    // 2. URLs avec paramètres contenant des données personnelles
    // Détecte les URLs avec des query params sensibles (email, user, token, etc.)
    {
      id: 'URL_PII',
      label: 'URL avec données personnelles',
      category: 'technique',
      rgpdCategory: 'art4',
      confidence: 'medium',
      regex: /https?:\/\/[^\s]+[?&](?:email|user(?:name|_?id)?|name|phone|ssn|token|api_?key|password|secret)=[^\s&]+/gi,
      pseudonymPrefix: 'URL',
      enabled: true
    },

    // 3. Handles réseaux sociaux (@username)
    // Matche @username précédé d'un espace, début de ligne ou parenthèse
    // 3-30 caractères alphanumériques + underscore, commence par lettre ou underscore
    {
      id: 'SOCIAL_HANDLE',
      label: 'Handle réseau social',
      category: 'contact',
      rgpdCategory: 'art4',
      confidence: 'low',
      regex: /(?:^|[\s(])@[a-zA-Z_]\w{2,29}\b/g,
      pseudonymPrefix: 'Social',
      enabled: true
    }
  ];

  window.PseudoShield.PatternsDigital = PATTERNS_DIGITAL;
})();
