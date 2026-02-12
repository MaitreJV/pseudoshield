// test/test-data.js
// Jeux de test réalistes pour l'anonymisation
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  window.Anonymizator.TestData = {
    // 1. Texte juridique belge
    juridiqueBelge: `Cher Maître Van den Berg,

Je soussigné Jean-Pierre Dupont, domicilié au 42 rue de la Loi, 1000 Bruxelles, né le 15/03/1985, numéro de registre national 85.03.15-123.45, vous confirme le virement de 5.000€ sur le compte BE68 5390 0754 7034 de la SRL TechConsult, numéro d'entreprise 0123.456.789, TVA BE0123.456.789.

Contact : jp.dupont@lawfirm.be / +32 475 12 34 56

L'audience est fixée au 15 mars 2026 devant le Tribunal de première instance de Bruxelles. La partie adverse, Mme Sophie Janssens (RN 90.06.22-234.56), domiciliée au 15 avenue Louise, 1050 Ixelles, est représentée par Me François De Smet.`,

    // 2. Email professionnel avec données mixtes
    emailProfessionnel: `De : hr@company.be
À : marc.leclercq@gmail.com
Objet : Contrat de travail

Cher Marc Leclercq,

Suite à notre entretien du 10/01/2026, nous vous confirmons votre engagement en qualité de Data Protection Officer à partir du 01/03/2026.

Votre salaire brut mensuel sera de 5.500€, versé sur le compte BE71 0961 2345 6769. Votre numéro national est le 88.12.05-345.67.

Merci de nous transmettre une copie de votre carte d'identité (n° 591-1234567-85) et de votre diplôme.

Cordialement,
Anne-Marie Van Damme
DRH — NovaTech SA
TVA : BE0987.654.321
Rue du Commerce 25, 1000 Bruxelles
+32 2 123 45 67`,

    // 3. Extrait médical fictif (données art. 9)
    medical: `RAPPORT MÉDICAL CONFIDENTIEL
Patient : Pierre Lemaire, né le 22/07/1978
NISS : 78.07.22-456.78
Adresse : 8 place du Sablon, 1000 Bruxelles

Diagnostic : Le patient présente un trouble dépressif majeur (F32.1) avec antécédents d'anxiété généralisée. Traitement en cours : Escitalopram 10mg/jour.

Médecin traitant : Dr. Catherine Dubois
INAMI : 1-23456-78-901`,

    // 4. Contrat commercial
    contratCommercial: `ENTRE :
La société DATAFLOW SA, BCE 0456.789.012, ayant son siège social au 100 boulevard Anspach, 1000 Bruxelles, représentée par M. Thomas Peeters, administrateur délégué, TVA BE0456.789.012, IBAN : BE43 3100 9876 5432

ET :
La société CLOUDSERVE SPRL, BCE 0234.567.890, ayant son siège social au 50 rue Haute, 1000 Bruxelles, représentée par Mme Laura Martens, gérante, TVA BE0234.567.890, IBAN : BE62 5100 1234 5678
Contact : l.martens@cloudserve.be / +32 498 76 54 32`,

    // 5. Texte sans données personnelles (pour test faux positifs)
    sansDonn: `Le règlement général sur la protection des données (RGPD) est un règlement de l'Union européenne qui constitue le texte de référence en matière de protection des données à caractère personnel. Il renforce et unifie la protection des données pour les individus au sein de l'Union européenne.

Le RGPD est entré en application le 25 mai 2018. Il s'applique à toute organisation, publique et privée, qui traite des données personnelles pour son compte ou non, dès lors qu'elle est établie sur le territoire de l'Union européenne ou que son activité cible directement des résidents européens.`
  };
})();
