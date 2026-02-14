// data/false-positive-bigrams.js
// Expressions institutionnelles et juridiques a exclure de la detection NOM_CONSECUTIF
// Ces bigrams capitalisés sont des faux positifs frequents (organisations, institutions, concepts)
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};
  if (!window.PseudoShield.Data) window.PseudoShield.Data = {};

  // Set normalise en minuscules pour comparaison case-insensitive
  window.PseudoShield.Data.FalsePositiveBigrams = new Set([
    // Institutions europeennes
    'union europeenne',
    'commission europeenne',
    'parlement europeen',
    'conseil europeen',
    'conseil europe',
    'cour justice',
    'banque centrale',
    'comite europeen',
    'comite regions',
    'cour comptes',
    'mediateur europeen',
    'agence europeenne',

    // Institutions belges
    'moniteur belge',
    'chambre representants',
    'conseil etat',
    'cour constitutionnelle',
    'cour cassation',
    'cour appel',
    'tribunal premiere',
    'tribunal commerce',
    'tribunal travail',
    'tribunal entreprise',
    'tribunal famille',
    'justice paix',
    'banque nationale',
    'autorite protection',
    'service public',
    'services publics',
    'region wallonne',
    'region bruxelloise',
    'region flamande',
    'communaute francaise',
    'communaute flamande',
    'communaute germanophone',
    'province liege',
    'province namur',
    'province hainaut',
    'province luxembourg',
    'province brabant',
    'province anvers',
    'province flandre',

    // Institutions francaises
    'assemblee nationale',
    'senat francais',
    'conseil constitutionnel',
    'cour administrative',
    'tribunal administratif',
    'tribunal judiciaire',
    'tribunal correctionnel',
    'cour assises',
    'conseil prud',
    'autorite marches',
    'haute autorite',

    // Concepts juridiques
    'code civil',
    'code penal',
    'code travail',
    'code commerce',
    'code judiciaire',
    'droit commun',
    'droit europeen',
    'droit international',
    'droit public',
    'droit prive',
    'droit social',
    'droit fiscal',
    'droits homme',
    'droits fondamentaux',
    'libre circulation',
    'marche interieur',
    'marche unique',
    'ordre public',
    'interet general',
    'interet legitime',
    'bonne foi',
    'force majeure',
    'vice cache',
    'faute grave',
    'responsabilite civile',
    'base legale',
    'donnees personnelles',
    'donnees sensibles',
    'protection donnees',
    'vie privee',
    'secret professionnel',

    // Organisations internationales
    'nations unies',
    'croix rouge',
    'amnesty international',
    'banque mondiale',
    'fonds monetaire',
    'organisation mondiale',
    'conseil securite',

    // Termes generiques courants
    'premier ministre',
    'directeur general',
    'secretaire general',
    'president directeur',
    'chef cabinet',
    'vice president',
    'porte parole',

    // Termes techniques courants en majuscules
    'intelligence artificielle',
    'apprentissage automatique',
    'machine learning',
    'deep learning',
    'open source',
    'big data',
    'cloud computing',

    // Localisations generiques
    'grand place',
    'place royale',
    'mont blanc',
    'saint germain',
    'saint denis'
  ]);
})();
