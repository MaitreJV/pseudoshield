// ui/toast.js
// Notification discrète après anonymisation — DOM methods (pas d'innerHTML)
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  const TOAST_DURATION = 4000;
  const TOAST_ID = 'pseudoshield-toast';

  // Categories valides pour prevenir l'injection via categoryCounts
  const VALID_CATEGORIES = new Set(['identite', 'contact', 'financier', 'adresse', 'technique']);

  const CATEGORY_LABELS = {
    identite: 'identité',
    contact: 'contact',
    financier: 'financier',
    adresse: 'adresse',
    technique: 'technique'
  };

  function show(result) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'pseudoshield-toast';

    // En-tete — construction DOM securisee
    const header = document.createElement('div');
    header.className = 'pseudoshield-toast-header';
    const check = document.createElement('span');
    check.className = 'pseudoshield-toast-check';
    check.textContent = '✓';
    header.appendChild(check);
    header.appendChild(document.createTextNode(
      ' ' + parseInt(result.replacementsCount || 0, 10) + ' donnees pseudonymisees'
    ));
    toast.appendChild(header);

    // Details par categorie — filtrage + textContent
    const categoryCounts = result.categoryCounts || {};
    const details = [];
    for (const [cat, count] of Object.entries(categoryCounts)) {
      // Accepter uniquement les categories connues
      if (!VALID_CATEGORIES.has(cat)) continue;
      details.push(parseInt(count, 10) + ' ' + CATEGORY_LABELS[cat]);
    }
    if (details.length > 0) {
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'pseudoshield-toast-details';
      detailsDiv.textContent = details.join(', ');
      toast.appendChild(detailsDiv);
    }

    // Indicateurs RGPD — valeurs numeriques uniquement
    const art4Count = parseInt(result.rgpdCategories?.art4 || 0, 10);
    const art9Count = parseInt(result.rgpdCategories?.art9 || 0, 10);
    if (art4Count > 0 || art9Count > 0) {
      const rgpdDiv = document.createElement('div');
      rgpdDiv.className = 'pseudoshield-toast-rgpd';
      if (art4Count > 0) {
        const art4Span = document.createElement('span');
        art4Span.className = 'pseudoshield-toast-art4';
        art4Span.textContent = art4Count + ' art.4';
        rgpdDiv.appendChild(art4Span);
      }
      if (art9Count > 0) {
        const art9Span = document.createElement('span');
        art9Span.className = 'pseudoshield-toast-art9';
        art9Span.textContent = art9Count + ' art.9';
        rgpdDiv.appendChild(art9Span);
      }
      toast.appendChild(rgpdDiv);
    }

    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('pseudoshield-toast-visible');
    });

    setTimeout(() => {
      toast.classList.remove('pseudoshield-toast-visible');
      toast.classList.add('pseudoshield-toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
  }

  window.PseudoShield.Toast = { show };
})();
