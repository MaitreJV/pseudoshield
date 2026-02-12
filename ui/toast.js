// ui/toast.js
// Notification discrète après anonymisation
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  const TOAST_DURATION = 4000;
  const TOAST_ID = 'anonymizator-toast';

  function show(result) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'anonymizator-toast';

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
    if (art4Count > 0) rgpdIndicator += '<span class="anonymizator-toast-art4">' + art4Count + ' art.4</span>';
    if (art9Count > 0) rgpdIndicator += '<span class="anonymizator-toast-art9">' + art9Count + ' art.9</span>';

    toast.innerHTML =
      '<div class="anonymizator-toast-header">' +
        '<span class="anonymizator-toast-check">✓</span> ' +
        result.replacementsCount + ' données anonymisées' +
      '</div>' +
      (details.length > 0 ? '<div class="anonymizator-toast-details">' + details.join(', ') + '</div>' : '') +
      (rgpdIndicator ? '<div class="anonymizator-toast-rgpd">' + rgpdIndicator + '</div>' : '');

    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('anonymizator-toast-visible');
    });

    setTimeout(() => {
      toast.classList.remove('anonymizator-toast-visible');
      toast.classList.add('anonymizator-toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
  }

  window.Anonymizator.Toast = { show };
})();
