// ui/toast.js
// Notification discrète après anonymisation
(function() {
  'use strict';

  if (!window.PseudoShield) window.PseudoShield = {};

  const TOAST_DURATION = 4000;
  const TOAST_ID = 'pseudoshield-toast';

  function show(result) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'pseudoshield-toast';

    const details = [];
    const categoryCounts = result.categoryCounts || {};
    const categoryLabels = {
      identite: 'identité',
      contact: 'contact',
      financier: 'financier',
      adresse: 'adresse',
      technique: 'technique'
    };

    for (const [cat, count] of Object.entries(categoryCounts)) {
      details.push(count + ' ' + (categoryLabels[cat] || cat));
    }

    const art4Count = result.rgpdCategories?.art4 || 0;
    const art9Count = result.rgpdCategories?.art9 || 0;

    let rgpdIndicator = '';
    if (art4Count > 0) rgpdIndicator += '<span class="pseudoshield-toast-art4">' + art4Count + ' art.4</span>';
    if (art9Count > 0) rgpdIndicator += '<span class="pseudoshield-toast-art9">' + art9Count + ' art.9</span>';

    toast.innerHTML =
      '<div class="pseudoshield-toast-header">' +
        '<span class="pseudoshield-toast-check">✓</span> ' +
        result.replacementsCount + ' donnees pseudonymisees' +
      '</div>' +
      (details.length > 0 ? '<div class="pseudoshield-toast-details">' + details.join(', ') + '</div>' : '') +
      (rgpdIndicator ? '<div class="pseudoshield-toast-rgpd">' + rgpdIndicator + '</div>' : '');

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
