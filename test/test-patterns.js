// test/test-patterns.js
// Tests unitaires pour les patterns de détection
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(testName, condition, details) {
    if (condition) {
      passed++;
      results.push({ name: testName, status: 'PASS', details });
    } else {
      failed++;
      results.push({ name: testName, status: 'FAIL', details });
    }
  }

  function runTests() {
    passed = 0;
    failed = 0;
    results.length = 0;

    const detect = window.PseudoShield.Detector.detect;

    // === NISS Tests ===
    // Soft validation : NISS fictif (checksum invalide) détecté avec confidence 'medium'
    let matches = detect('numéro 85.03.15-123.45 ici');
    assert('NISS: détection format standard (soft)', matches.some(m => m.patternId === 'NISS_BE'), 'Should detect 85.03.15-123.45 via soft validation');

    let nissMatch = matches.find(m => m.patternId === 'NISS_BE');
    assert('NISS: soft validation → confidence medium', nissMatch && nissMatch.confidence === 'medium', 'Fictive NISS should have medium confidence, got: ' + (nissMatch ? nissMatch.confidence : 'none'));

    // Format invalide (trop court, pas de match regex)
    matches = detect('NISS invalide 99.99.99');
    assert('NISS: rejet format trop court', !matches.some(m => m.patternId === 'NISS_BE'), 'Should reject too-short format');

    // === IBAN Tests ===
    matches = detect('compte BE68 5390 0754 7034');
    assert('IBAN BE: détection avec espaces', matches.some(m => m.patternId === 'IBAN_BE'), 'Should detect BE IBAN');

    matches = detect('IBAN FR76 3000 6000 0112 3456 7890 189');
    assert('IBAN FR: détection', matches.some(m => m.patternId === 'IBAN_FR'), 'Should detect FR IBAN');

    // === TVA Tests ===
    matches = detect('TVA BE0123.456.789');
    assert('TVA BE: détection', matches.some(m => m.patternId === 'TVA_BE'), 'Should detect BE VAT');

    matches = detect('TVA FR12 345 678 901');
    assert('TVA FR: détection', matches.some(m => m.patternId === 'TVA_FR'), 'Should detect FR VAT');

    // === Email Tests ===
    matches = detect('contact : jp.dupont@lawfirm.be');
    assert('Email: détection standard', matches.some(m => m.patternId === 'EMAIL'), 'Should detect email');

    // === Phone Tests ===
    matches = detect('tel: +32 475 12 34 56');
    assert('Tel BE: détection +32', matches.some(m => m.patternId === 'TEL_BE' || m.patternId === 'TEL_INT'), 'Should detect BE phone');

    // === Date Tests ===
    matches = detect('né le 15/03/1985');
    assert('Date: détection DD/MM/YYYY', matches.some(m => m.patternId === 'DATE_NAISSANCE'), 'Should detect EU date');

    // === IP Tests ===
    matches = detect('serveur 192.168.1.1 actif');
    assert('IPv4: détection', matches.some(m => m.patternId === 'IPV4'), 'Should detect IPv4');

    // === Carte ID Tests ===
    matches = detect('carte 591-1234567-85');
    assert('CI BE: détection', matches.some(m => m.patternId === 'CI_BE'), 'Should detect BE ID card');

    // === Nom propre Tests ===
    matches = detect('Mme Sophie Janssens est présente');
    assert('Nom civilité: détection Mme', matches.some(m => m.patternId === 'NOM_CIVILITE'), 'Should detect name after civility');

    matches = detect('Patient : Pierre Lemaire');
    assert('Nom contexte: détection Patient', matches.some(m => m.patternId === 'NOM_CONTEXTE'), 'Should detect name after context');

    // Nouveaux contextes ajoutés
    matches = detect('le soussigné Jean-Pierre Dupont');
    assert('Nom contexte: soussigné', matches.some(m => m.patternId === 'NOM_CONTEXTE'), 'Should detect name after soussigné');

    matches = detect('Cher Marc Janssens');
    assert('Nom contexte: Cher', matches.some(m => m.patternId === 'NOM_CONTEXTE'), 'Should detect name after Cher');

    // NOM_MULTICONTEXTE : représenté par, ci-après dénommé
    matches = detect('représenté par Sophie Lambert');
    assert('Nom multi-contexte: représenté par', matches.some(m => m.patternId === 'NOM_MULTICONTEXTE'), 'Should detect name after représenté par');

    matches = detect('ci-après dénommé Paul Vermeer');
    assert('Nom multi-contexte: ci-après dénommé', matches.some(m => m.patternId === 'NOM_MULTICONTEXTE'), 'Should detect name after ci-après dénommé');

    // NOM_CONSECUTIF : deux mots capitalisés consécutifs (heuristique)
    matches = detect('contrat signé par Jean Dupont en date');
    assert('Nom consécutif: heuristique', matches.some(m => m.patternId === 'NOM_CONSECUTIF'), 'Should detect consecutive capitalized words after lowercase');

    // Particules belges/françaises
    matches = detect('Mme Van den Berg est convoquée');
    assert('Nom civilité: particule Van den', matches.some(m => m.patternId === 'NOM_CIVILITE'), 'Should detect name with particule');

    // === Passeport Tests ===
    matches = detect('passeport EH123456 delivre a Bruxelles');
    assert('Passeport BE: detection EH', matches.some(m => m.patternId === 'PASSPORT_BE'), 'Should detect BE passport EH format');

    matches = detect('passeport EI987654');
    assert('Passeport BE: detection EI', matches.some(m => m.patternId === 'PASSPORT_BE'), 'Should detect BE passport EI format');

    matches = detect('passeport EX123456');
    assert('Passeport BE: rejet EX', !matches.some(m => m.patternId === 'PASSPORT_BE'), 'Should reject EX prefix (not BE passport)');

    matches = detect('passeport 12AB34567');
    assert('Passeport FR: detection', matches.some(m => m.patternId === 'PASSPORT_FR'), 'Should detect FR passport format');

    // === INAMI Tests ===
    matches = detect('medecin INAMI 1-23456-72-901');
    assert('INAMI: detection format standard', matches.some(m => m.patternId === 'INAMI_BE'), 'Should detect INAMI number');

    // === GPS Tests ===
    matches = detect('coordonnees : 50.8503, 4.3517');
    assert('GPS: detection Bruxelles', matches.some(m => m.patternId === 'GPS_COORD'), 'Should detect GPS coordinates (Brussels)');

    matches = detect('ratio 3.14');
    assert('GPS: rejet nombre simple', !matches.some(m => m.patternId === 'GPS_COORD'), 'Should not detect simple numbers as GPS');

    // === URL PII Tests ===
    matches = detect('lien : https://example.com/api?email=jean@test.be&page=1');
    assert('URL PII: detection email param', matches.some(m => m.patternId === 'URL_PII'), 'Should detect URL with email parameter');

    matches = detect('https://example.com/page?sort=date&limit=10');
    assert('URL PII: rejet URL sans PII', !matches.some(m => m.patternId === 'URL_PII'), 'Should not detect URL without PII params');

    // === Social Handle Tests ===
    matches = detect('suivez-moi sur @MaitreJV pour les actualites');
    assert('Social Handle: detection @username', matches.some(m => m.patternId === 'SOCIAL_HANDLE'), 'Should detect social handle');

    // === NOM_CONSECUTIF False Positive Tests ===
    matches = detect('selon la Commission Europeenne, le reglement');
    assert('NOM_CONSECUTIF: rejet Commission Europeenne', !matches.some(m => m.patternId === 'NOM_CONSECUTIF' && m.match.toLowerCase().includes('commission')), 'Should reject "Commission Europeenne" as false positive');

    matches = detect('devant le Tribunal Commerce de Bruxelles');
    assert('NOM_CONSECUTIF: rejet Tribunal Commerce', !matches.some(m => m.patternId === 'NOM_CONSECUTIF' && m.match.toLowerCase().includes('tribunal')), 'Should reject "Tribunal Commerce" as false positive');

    // === Confidence Threshold Tests ===
    var strictMatches = detect('contrat signe par Jean Dupont en date, +32 475 12 34 56', { confidenceThreshold: 'high' });
    assert('Seuil strict: filtre low confidence', !strictMatches.some(m => m.confidence === 'low'), 'Strict threshold should filter out low confidence');

    var aggressiveMatches = detect('contrat signe par Jean Dupont en date, +32 475 12 34 56', { confidenceThreshold: 'low' });
    assert('Seuil agressif: accepte tout', aggressiveMatches.length >= strictMatches.length, 'Aggressive threshold should find >= strict matches');

    // === False Positives ===
    matches = detect('Le RGPD est un reglement europeen entre en vigueur le 25 mai 2018.');
    assert('Faux positifs: texte generique', matches.length === 0, 'Should not detect anything in generic text');

    matches = detect('Bonjour, comment allez-vous ?');
    assert('Faux positifs: salutation', matches.length === 0, 'Should not detect anything in greeting');

    // === Validator Tests ===
    const { validateNISS, validateIBAN, validateLuhn, validateSecuFR, validateINAMI } = window.PseudoShield.Validators;

    assert('Validator NISS: format fictif rejeté', !validateNISS('85.03.15-123.45'), 'Fictive NISS should fail modulo 97 validation');
    assert('Validator IBAN: BE valide', validateIBAN('BE68539007547034'), 'Should validate correct IBAN');
    assert('Validator Luhn: carte valide', validateLuhn('4532015112830366'), 'Should validate correct card');
    assert('Validator Luhn: carte invalide', !validateLuhn('1234567890123456'), 'Should reject invalid card');
    assert('Validator INAMI: format disponible', typeof validateINAMI === 'function', 'Should have INAMI validator');

    // === Full text tests ===
    matches = detect(window.PseudoShield.TestData.juridiqueBelge);
    assert('Texte juridique: détections multiples', matches.length >= 5, 'Should detect at least 5 items in legal text, found: ' + matches.length);

    matches = detect(window.PseudoShield.TestData.sansDonn);
    assert('Texte sans donnees: zero detection', matches.length === 0, 'Should detect nothing in clean text, found: ' + matches.length);

    // Test document 6 : donnees numeriques (passeport, GPS, URL PII, social, INAMI)
    if (window.PseudoShield.TestData.numerique) {
      matches = detect(window.PseudoShield.TestData.numerique);
      assert('Texte numerique: detections multiples', matches.length >= 5, 'Should detect at least 5 items in digital text, found: ' + matches.length);
      assert('Texte numerique: passeport detecte', matches.some(m => m.patternId === 'PASSPORT_BE'), 'Should detect passport in digital text');
      assert('Texte numerique: GPS detecte', matches.some(m => m.patternId === 'GPS_COORD'), 'Should detect GPS in digital text');
      assert('Texte numerique: URL PII detectee', matches.some(m => m.patternId === 'URL_PII'), 'Should detect URL PII in digital text');
      assert('Texte numerique: faux positifs institutions', !matches.some(m => m.patternId === 'NOM_CONSECUTIF' && m.match.toLowerCase().includes('tribunal commerce')), 'Should not detect "Tribunal Commerce" as name');
    }

    return { passed, failed, total: passed + failed, results };
  }

  window.PseudoShield.TestPatterns = { runTests };
})();
