# PseudoShield

> Pseudonymize personal data before pasting into AI — 100% local Chrome extension.

PseudoShield intercepts paste events (Ctrl+V) on major AI platforms and automatically replaces personal data with deterministic pseudonyms (SHA-256) before the text reaches the chat interface. The AI never sees the real data.

## Features

- **35 detection patterns** — names (4 strategies), Belgian NISS, IBAN (7 countries), VAT, BCE, INAMI, emails, phones, addresses, credit cards, IPs, GPS coordinates, social handles
- **Mathematical validation** — Modulo 97 (NISS/IBAN/INAMI), Luhn (credit cards), ISO 13616
- **GDPR compliance tools** — Art. 30 audit journal (CSV/JSON export), Art. 4/Art. 9 categorization, correspondence table
- **100% local** — zero telemetry, no server, no account, Web Crypto API (SHA-256)
- **6 AI platforms** — Claude.ai, ChatGPT, DeepSeek, Gemini, Copilot, Perplexity

## How it works

```
Original text (Ctrl+V)          Pseudonymized text (inserted)
─────────────────────           ─────────────────────────────
Jean-Pierre Dupont        →    [Personne_13]
15/03/1985                →    [Date_1]
85.03.15-123.45           →    [NISS_1]
BE68 5390 0754 7034       →    [IBAN_1]
jp.dupont@lawfirm.be      →    [Email_3]
```

The extension intercepts the paste, detects PII using regex + validation, replaces with pseudonyms, and inserts the cleaned text. Original data stays in RAM only — never written to disk.

## Supported platforms

| Platform | Domain | Adapter |
|----------|--------|---------|
| Claude | claude.ai | ProseMirror |
| ChatGPT | chatgpt.com | ProseMirror |
| DeepSeek | chat.deepseek.com | Textarea |
| Copilot | copilot.microsoft.com | Textarea |
| Gemini | gemini.google.com | Quill |
| Perplexity | perplexity.ai | Quill |

## Installation

### Chrome Web Store

Coming soon — under review.

### Manual (developer mode)

1. Clone this repo: `git clone https://github.com/MaitreJV/pseudoshield.git`
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the cloned folder
5. Navigate to any supported AI platform and paste text with personal data

## Project structure

```
pseudoshield/
├── manifest.json              # Manifest V3
├── content.js                 # Main content script (paste interception)
├── background.js              # Service worker (alarms, cleanup)
├── popup.html/js              # Extension popup (stats, controls)
├── options.html/js            # Settings page (patterns, sites, journal)
├── privacy.html               # GDPR privacy policy
├── adapters/                  # Platform-specific text insertion
│   ├── adapter-prosemirror.js # Claude.ai, ChatGPT
│   ├── adapter-textarea.js    # DeepSeek, Copilot
│   ├── adapter-quill.js       # Gemini, Perplexity
│   ├── adapter-generic.js     # Fallback for other sites
│   ├── adapter-registry.js    # Adapter selection logic
│   └── cursor-manager.js      # Cursor position management
├── anonymizer/                # Detection & pseudonymization engine
│   ├── patterns-eu.js         # EU patterns (NISS, IBAN, VAT, BCE...)
│   ├── patterns-generic.js    # Generic patterns (names, dates, addresses)
│   ├── patterns-digital.js    # Digital patterns (emails, phones, IPs)
│   ├── detector.js            # Pattern matching orchestrator
│   ├── processor.js           # Main processing pipeline
│   ├── pseudonym-engine.js    # SHA-256 pseudonym generation
│   ├── storage-manager.js     # chrome.storage.local management
│   └── rgpd-logger.js         # GDPR Art. 30 audit logging
├── data/                      # Reference data
│   ├── first-names-be-fr.js   # Belgian/French first names dictionary
│   └── false-positive-bigrams.js # Common word pairs to exclude
├── utils/                     # Utilities
│   ├── hash.js                # Web Crypto SHA-256 wrapper
│   ├── clipboard.js           # Clipboard interception
│   ├── debounce.js            # Debounce utility
│   └── site-adapters.js       # Site detection & adapter mapping
├── ui/                        # UI components
│   ├── toast.js               # Notification toasts
│   ├── toast.css              # Toast styles
│   └── popup.css              # Popup styles
├── icons/                     # Extension icons (16/32/48/128)
├── _locales/                  # i18n (fr)
└── test/                      # Test suite
    ├── test-patterns.js       # Pattern detection tests
    ├── test-data.js           # Test fixtures
    └── run-node.js            # Node.js test runner
```

## Privacy

- **No data collection** — everything runs locally in your browser
- **No network requests** — the extension makes zero HTTP calls
- **No accounts** — no sign-up, no login, no tracking
- **Open source** — inspect every line of code
- **7-day retention** — automatic cleanup of stored pseudonyms

Full privacy policy: [maitrejv.github.io/pseudoshield/privacy.html](https://maitrejv.github.io/pseudoshield/privacy.html)

## Legal note

PseudoShield performs **pseudonymization** as defined in GDPR Art. 4(5), not anonymization. The correspondence table allows re-identification by the data controller. This tool helps reduce exposure of personal data to third-party AI providers but does not eliminate all GDPR obligations.

## Author

**Jeoffrey Vigneron** — Attorney at the Brussels Bar, AI law specialist

- [lawgitech.eu](https://lawgitech.eu)
- [lawgitech.academy](https://lawgitech.academy)

## License

MIT
