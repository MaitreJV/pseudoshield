// utils/site-adapters.js
// Adaptateurs spécifiques par site pour l'insertion de texte
(function() {
  'use strict';

  if (!window.Anonymizator) window.Anonymizator = {};

  const SITE_ADAPTERS = {
    'claude.ai': {
      name: 'Claude',
      selector: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"]',
      insertMethod: 'inputEvent',
      detect: () => location.hostname === 'claude.ai'
    },
    'chatgpt.com': {
      name: 'ChatGPT',
      selector: '#prompt-textarea, div[contenteditable="true"][id="prompt-textarea"]',
      insertMethod: 'inputEvent',
      detect: () => location.hostname === 'chatgpt.com'
    },
    'gemini.google.com': {
      name: 'Gemini',
      selector: 'rich-textarea .ql-editor, div[contenteditable="true"]',
      insertMethod: 'execCommand',
      detect: () => location.hostname === 'gemini.google.com'
    },
    'copilot.microsoft.com': {
      name: 'Copilot',
      selector: 'textarea, #searchbox textarea',
      insertMethod: 'nativeValue',
      detect: () => location.hostname === 'copilot.microsoft.com'
    },
    'chat.deepseek.com': {
      name: 'DeepSeek',
      selector: 'textarea#chat-input, textarea',
      insertMethod: 'nativeValue',
      detect: () => location.hostname.includes('deepseek.com')
    },
    'perplexity.ai': {
      name: 'Perplexity',
      selector: 'textarea, div[contenteditable="true"]',
      insertMethod: 'inputEvent',
      detect: () => location.hostname === 'perplexity.ai'
    }
  };

  function getAdapter() {
    for (const [domain, adapter] of Object.entries(SITE_ADAPTERS)) {
      if (adapter.detect()) {
        return { domain, ...adapter };
      }
    }
    return {
      domain: 'default',
      name: 'Générique',
      selector: 'textarea:focus, [contenteditable="true"]:focus, input[type="text"]:focus',
      insertMethod: 'execCommand',
      detect: () => true
    };
  }

  function insertText(element, text, adapter) {
    if (!element || !text) return false;

    try {
      switch (adapter.insertMethod) {
        case 'inputEvent':
          return insertViaInputEvent(element, text);
        case 'nativeValue':
          return insertViaNativeValue(element, text);
        case 'execCommand':
          return insertViaExecCommand(element, text);
        default:
          return insertViaExecCommand(element, text);
      }
    } catch (e) {
      console.warn('[Anonymizator] Méthode', adapter.insertMethod, 'échouée, fallback execCommand:', e);
      return insertViaExecCommand(element, text);
    }
  }

  function insertViaInputEvent(element, text) {
    element.focus();

    const inputEvent = new InputEvent('input', {
      inputType: 'insertFromPaste',
      data: text,
      bubbles: true,
      cancelable: true,
      composed: true
    });

    if (element.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      } else {
        element.textContent += text;
      }
    }

    element.dispatchEvent(inputEvent);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function insertViaNativeValue(element, text) {
    element.focus();

    // Insérer au curseur plutôt qu'écraser tout le contenu
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const currentValue = element.value || '';
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, newValue);
    } else {
      element.value = newValue;
    }

    // Repositionner le curseur après le texte inséré
    const newCursorPos = start + text.length;
    element.selectionStart = newCursorPos;
    element.selectionEnd = newCursorPos;

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function insertViaExecCommand(element, text) {
    element.focus();
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      // Fallback : insérer au curseur plutôt qu'écraser
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const currentValue = element.value || '';
        element.value = currentValue.substring(0, start) + text + currentValue.substring(end);
        const newCursorPos = start + text.length;
        element.selectionStart = newCursorPos;
        element.selectionEnd = newCursorPos;
      } else {
        // contentEditable : insérer au point de sélection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
        } else {
          element.textContent += text;
        }
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  function findTarget(adapter) {
    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.contentEditable === 'true')) {
      return active;
    }
    return document.querySelector(adapter.selector);
  }

  window.Anonymizator.SiteAdapters = {
    getAdapter,
    insertText,
    findTarget,
    SITE_ADAPTERS
  };
})();
