// data/first-names-be-fr.js
// Prenoms courants BE/FR/NL pour booster la confiance de la detection NOM_CONSECUTIF
// Si le premier mot d'un bigram est un prenom connu, la confiance passe de 'low' a 'medium'
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};
  if (!window.PseudoShield.Data) window.PseudoShield.Data = {};

  // Set normalise en minuscules pour comparaison case-insensitive
  // ~200 prenoms les plus courants en Belgique, France, Pays-Bas
  window.PseudoShield.Data.FirstNames = new Set([
    // Prenoms masculins francophones courants
    'jean', 'pierre', 'marc', 'philippe', 'michel',
    'jacques', 'paul', 'christian', 'bernard', 'patrick',
    'alain', 'daniel', 'claude', 'andre', 'francois',
    'thierry', 'nicolas', 'laurent', 'david', 'stephane',
    'eric', 'frederic', 'christophe', 'olivier', 'pascal',
    'julien', 'thomas', 'alexandre', 'mathieu', 'guillaume',
    'maxime', 'antoine', 'kevin', 'jerome', 'sebastien',
    'benoit', 'arnaud', 'damien', 'cedric', 'vincent',
    'yves', 'georges', 'louis', 'charles', 'henri',
    'rene', 'albert', 'joseph', 'robert', 'gerard',
    'bruno', 'didier', 'serge', 'dominique', 'luc',
    'hugues', 'xavier', 'quentin', 'florian', 'adrien',
    'romain', 'hugo', 'lucas', 'nathan', 'ethan',
    'gabriel', 'raphael', 'arthur', 'leo', 'adam',
    'noel', 'gauthier', 'martin', 'simon', 'emile',

    // Prenoms feminins francophones courants
    'marie', 'anne', 'sophie', 'nathalie', 'isabelle',
    'christine', 'catherine', 'monique', 'brigitte', 'valerie',
    'sylvie', 'francoise', 'nicole', 'martine', 'veronique',
    'patricia', 'sandrine', 'laurence', 'caroline', 'virginie',
    'aurelie', 'stephanie', 'celine', 'emilie', 'julie',
    'sarah', 'laura', 'camille', 'manon', 'chloe',
    'lea', 'emma', 'clara', 'alice', 'charlotte',
    'juliette', 'louise', 'margaux', 'helene', 'lucie',
    'pauline', 'mathilde', 'marine', 'elise', 'amelie',
    'elodie', 'delphine', 'audrey', 'florence', 'corinne',
    'madeleine', 'therese', 'jeanne', 'marguerite', 'denise',

    // Prenoms neerlandophones courants (Flandre, Pays-Bas)
    'jan', 'pieter', 'johannes', 'hendrik', 'willem',
    'cornelis', 'gerrit', 'dirk', 'bart', 'wim',
    'koen', 'stijn', 'wouter', 'jeroen', 'sander',
    'maarten', 'joost', 'ruben', 'lars', 'niels',
    'bram', 'thijs', 'daan', 'sem', 'liam',
    'jef', 'hans', 'frank', 'peter', 'erik',
    'geert', 'filip', 'tom', 'tim', 'steven',
    'maria', 'els', 'ann', 'katrien', 'joke',
    'lies', 'sofie', 'leen', 'inge', 'hilde',
    'griet', 'lotte', 'femke', 'anke', 'nele',
    'sara', 'jana', 'emma', 'lien', 'karen',

    // Prenoms mixtes / internationaux courants en Belgique
    'alex', 'sam', 'robin', 'kim', 'morgan',
    'jordan', 'maxim', 'noah', 'lina', 'yasmine',
    'mehdi', 'karim', 'fatima', 'mohammed', 'ahmed',
    'youssef', 'rachid', 'said', 'abdel', 'omar'
  ]);
})();
