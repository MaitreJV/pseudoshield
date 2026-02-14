// test/test-data.js
// Jeux de test réalistes pour l'anonymisation
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  window.PseudoShield.TestData = {
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
INAMI : 1-23456-72-901`,

    // 4. Contrat commercial
    contratCommercial: `ENTRE :
La société DATAFLOW SA, BCE 0456.789.012, ayant son siège social au 100 boulevard Anspach, 1000 Bruxelles, représentée par M. Thomas Peeters, administrateur délégué, TVA BE0456.789.012, IBAN : BE43 3100 9876 5432

ET :
La société CLOUDSERVE SPRL, BCE 0234.567.890, ayant son siège social au 50 rue Haute, 1000 Bruxelles, représentée par Mme Laura Martens, gérante, TVA BE0234.567.890, IBAN : BE62 5100 1234 5678
Contact : l.martens@cloudserve.be / +32 498 76 54 32`,

    // 5. Texte sans donnees personnelles (pour test faux positifs)
    sansDonn: `Le reglement general sur la protection des donnees (RGPD) est un reglement de l'Union europeenne qui constitue le texte de reference en matiere de protection des donnees a caractere personnel. Il renforce et unifie la protection des donnees pour les individus au sein de l'Union europeenne.

Le RGPD est entre en application le 25 mai 2018. Il s'applique a toute organisation, publique et privee, qui traite des donnees personnelles pour son compte ou non, des lors qu'elle est etablie sur le territoire de l'Union europeenne ou que son activite cible directement des residents europeens.`,

    // 6. Donnees numeriques (Phase 2 — passeports, GPS, URLs PII, handles sociaux)
    numerique: `RAPPORT D'INVESTIGATION
Sujet : Jean-Marc Delvaux, passeport EH654321

Localisation : le suspect a ete localise aux coordonnees 50.8503, 4.3517 (centre de Bruxelles)
le 12/02/2026 a 14h30.

Profil en ligne : @jmdelvaux (Twitter), @jm_delvaux (Instagram)

Liens consultes :
- https://example.com/profile?user_id=12345&email=jm.delvaux@mail.be
- https://api.service.com/data?token=abc123secret&name=Delvaux

Son medecin traitant, Dr. Catherine Dubois (INAMI 1-23456-72-901), a confirme le rendez-vous.

Le Tribunal Commerce de Bruxelles a ete saisi par la Commission Europeenne dans cette affaire.
IP du serveur : 192.168.1.100`
  };
})();
