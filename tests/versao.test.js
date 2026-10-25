/**
 * Etiqueta de versão (proteção contra cache) — scripts/versao.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { versionarJs, versionarHtml, calcularVersao } from '../scripts/versao.mjs';

test('versão: etiqueta imports relativos e troca a antiga', () => {
  const js = [
    "import { h } from '../../core/dom.js';",
    'import { x } from "./a.js?v=antiga";',
    "import './efeito.js';",
    "const m = await import('../tela.js');",
    "import { test } from 'node:test';",
  ].join('\n');
  assert.equal(versionarJs(js, 'abc'), [
    "import { h } from '../../core/dom.js?v=abc';",
    'import { x } from "./a.js?v=abc";',
    "import './efeito.js?v=abc';",
    "const m = await import('../tela.js?v=abc');",
    "import { test } from 'node:test';",
  ].join('\n'));
});

test('versão: etiqueta só scripts e estilos locais do HTML', () => {
  const html = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">'
    + '<link rel="stylesheet" href="css/styles.css?v=old"><script src="js/tema-inicial.js"></script>'
    + '<link rel="icon" href="assets/logo.png"><script type="module" src="js/main.js"></script>';
  assert.equal(versionarHtml(html, 'n1'), '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">'
    + '<link rel="stylesheet" href="css/styles.css?v=n1"><script src="js/tema-inicial.js?v=n1"></script>'
    + '<link rel="icon" href="assets/logo.png"><script type="module" src="js/main.js?v=n1"></script>');
});

test('versão: muda com o conteúdo e ignora etiquetas antigas', () => {
  const a = calcularVersao([{ caminho: 'js/a.js', texto: "import './b.js';" }]);
  assert.equal(calcularVersao([{ caminho: 'js/a.js', texto: "import './b.js?v=qualquer';" }]), a);
  assert.equal(calcularVersao([{ caminho: 'js/a.js', texto: "import './b.js';\r\n" }]),
    calcularVersao([{ caminho: 'js/a.js', texto: "import './b.js';\n" }]));
  assert.notEqual(calcularVersao([{ caminho: 'js/a.js', texto: "import './c.js';" }]), a);
});

test('versão: todo import do site leva a mesma etiqueta', () => {
  const listar = (p) => readdirSync(p, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listar(join(p, e.name)) : e.name.endsWith('.js') ? [join(p, e.name)] : []));
  const etiquetas = new Set();
  const sem = [];
  for (const arq of listar('js')) {
    for (const m of readFileSync(arq, 'utf8').matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const v = m[1].match(/\?v=([\w-]+)$/);
      if (v) etiquetas.add(v[1]); else sem.push(`${arq}: ${m[1]}`);
    }
  }
  for (const m of readFileSync('index.html', 'utf8').matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) {
    const v = m[1].match(/\?v=([\w-]+)$/);
    if (v) etiquetas.add(v[1]); else sem.push(`index.html: ${m[1]}`);
  }
  assert.deepEqual(sem, [], 'arquivos sem etiqueta — rode `npm run versao`');
  assert.equal(etiquetas.size, 1, 'etiquetas diferentes — rode `npm run versao`');
});
