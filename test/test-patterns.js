// test/test-patterns.js
// Tests unitaires pour les patterns de détection
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

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

    const detect = window.Anonymizator.Detector.detect;

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

    // === False Positives ===
    matches = detect('Le RGPD est un règlement européen entré en vigueur le 25 mai 2018.');
    assert('Faux positifs: texte générique', matches.length === 0, 'Should not detect anything in generic text');

    matches = detect('Bonjour, comment allez-vous ?');
    assert('Faux positifs: salutation', matches.length === 0, 'Should not detect anything in greeting');

    // === Validator Tests ===
    const { validateNISS, validateIBAN, validateLuhn, validateSecuFR } = window.Anonymizator.Validators;

    assert('Validator NISS: format fictif rejeté', !validateNISS('85.03.15-123.45'), 'Fictive NISS should fail modulo 97 validation');
    assert('Validator IBAN: BE valide', validateIBAN('BE68539007547034'), 'Should validate correct IBAN');
    assert('Validator Luhn: carte valide', validateLuhn('4532015112830366'), 'Should validate correct card');
    assert('Validator Luhn: carte invalide', !validateLuhn('1234567890123456'), 'Should reject invalid card');

    // === Full text tests ===
    matches = detect(window.Anonymizator.TestData.juridiqueBelge);
    assert('Texte juridique: détections multiples', matches.length >= 5, 'Should detect at least 5 items in legal text, found: ' + matches.length);

    matches = detect(window.Anonymizator.TestData.sansDonn);
    assert('Texte sans données: zéro détection', matches.length === 0, 'Should detect nothing in clean text, found: ' + matches.length);

    return { passed, failed, total: passed + failed, results };
  }

  window.Anonymizator.TestPatterns = { runTests };
})();
