// test/run-node.js
// Exécution des tests via Node.js avec simulation de l'environnement navigateur
const { webcrypto } = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Simuler l'environnement navigateur
const context = {
  window: {},
  console,
  performance: { now: () => performance.now() },
  chrome: {
    storage: {
      local: {
        _data: {},
        get(keys) {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(k => { if (this._data[k] !== undefined) result[k] = this._data[k]; });
          return Promise.resolve(result);
        },
        set(items) {
          Object.assign(this._data, items);
          return Promise.resolve();
        },
        remove(keys) {
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(k => delete this._data[k]);
          return Promise.resolve();
        }
      }
    },
    runtime: {
      sendMessage() { return Promise.resolve({}); },
      onMessage: { addListener() {} }
    }
  },
  crypto: webcrypto,
  TextEncoder,
  RegExp,
  Array,
  Map,
  Date,
  Object,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  JSON,
  Math,
  String,
  Number,
  Error,
  TypeError,
  setTimeout,
  clearTimeout
};

// window === contexte global
context.window = context;

// Charger les modules dans l'ordre
const modules = [
  '../utils/hash.js',
  '../anonymizer/patterns-eu.js',
  '../anonymizer/patterns-generic.js',
  '../anonymizer/detector.js',
  '../anonymizer/pseudonym-engine.js',
  '../anonymizer/processor.js',
  'test-data.js',
  'test-patterns.js'
];

const sandbox = vm.createContext(context);

for (const mod of modules) {
  const filePath = path.resolve(__dirname, mod);
  const code = fs.readFileSync(filePath, 'utf-8');
  try {
    vm.runInContext(code, sandbox, { filename: mod });
  } catch (e) {
    console.error(`ERREUR chargement ${mod}:`, e.message);
    process.exit(1);
  }
}

// Exécuter les tests
console.log('\n=== Anonymizator Pattern Tests ===\n');

const results = sandbox.window.Anonymizator.TestPatterns.runTests();

// Affichage
for (const r of results.results) {
  const icon = r.status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${icon}  ${r.name}`);
  if (r.status === 'FAIL') {
    console.log(`         ${r.details}`);
  }
}

console.log(`\n  Total: ${results.total} | \x1b[32mPass: ${results.passed}\x1b[0m | \x1b[31mFail: ${results.failed}\x1b[0m\n`);

// Bonus : test rapide du processeur complet sur le texte juridique
(async () => {
  await sandbox.window.Anonymizator.PseudonymEngine.init();
  const procResult = await sandbox.window.Anonymizator.Processor.process(
    sandbox.window.Anonymizator.TestData.juridiqueBelge
  );
  console.log('=== Test processeur (texte juridique) ===\n');
  console.log(`  Detections: ${procResult.replacementsCount}`);
  console.log(`  Art.4: ${procResult.rgpdCategories.art4} | Art.9: ${procResult.rgpdCategories.art9}`);
  console.log(`  Temps: ${procResult.processingTimeMs.toFixed(1)} ms`);
  console.log(`  Patterns: ${procResult.detections.map(d => d.patternId + '(' + d.confidence + ')').join(', ')}`);
  console.log('');

  // Vérifier les détections attendues
  const expectedPatterns = ['NISS_BE', 'IBAN_BE', 'TVA_BE', 'EMAIL', 'DATE_NAISSANCE'];
  const foundIds = procResult.detections.map(d => d.patternId);
  let allGood = true;
  for (const exp of expectedPatterns) {
    if (foundIds.includes(exp)) {
      console.log(`  \x1b[32mOK\x1b[0m  ${exp} detecte`);
    } else {
      console.log(`  \x1b[31mKO\x1b[0m  ${exp} NON detecte`);
      allGood = false;
    }
  }

  // Vérifier soft validation NISS
  const nissDetection = procResult.detections.find(d => d.patternId === 'NISS_BE');
  if (nissDetection) {
    if (nissDetection.confidence === 'medium') {
      console.log(`  \x1b[32mOK\x1b[0m  NISS soft validation → confidence medium`);
    } else {
      console.log(`  \x1b[31mKO\x1b[0m  NISS confidence attendue 'medium', obtenue '${nissDetection.confidence}'`);
      allGood = false;
    }
  }

  // Vérifier détection noms propres
  const nomPatterns = procResult.detections.filter(d => d.patternId.startsWith('NOM_'));
  console.log(`  \x1b[32mOK\x1b[0m  ${nomPatterns.length} nom(s) propre(s) detecte(s): ${nomPatterns.map(d => d.match).join(', ')}`);

  console.log('');
  process.exit(allGood && results.failed === 0 ? 0 : 1);
})();
