/**
 * ETIQUETA DE VERSÃO DOS ARQUIVOS (proteção contra cache)
 * --------------------------------------------------------------
 * O GitHub Pages deixa cada arquivo 10 minutos no cache do navegador.
 * Logo depois de publicar, o navegador poderia misturar arquivos novos
 * com antigos e quebrar o site. Para evitar isso, todo import de JS e
 * os <script>/<link> do index.html levam "?v=<etiqueta>", calculada a
 * partir do conteúdo de js/ e css/. Mudou o código → muda a etiqueta →
 * o navegador baixa tudo de novo, de uma vez.
 *
 * Roda sozinho no `npm test` (ou manualmente: `npm run versao`).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ETIQUETA = /\?v=[\w-]*/g;

// import ... from './x.js'  |  import './x.js'  |  import('./x.js')
const IMPORT_RELATIVO = /((?:\bfrom|\bimport)\s*\(?\s*)(['"])(\.{1,2}\/[^'"?]+\.js)(?:\?v=[\w-]*)?\2/g;
// <script src="js/..."> e <link href="css/..."> do index.html
const REF_HTML = /((?:src|href)=")((?:\.\/)?(?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[\w-]*)?"/g;

/** Coloca (ou troca) a etiqueta em todos os imports relativos de um arquivo JS. */
export function versionarJs(texto, versao) {
  return texto.replace(IMPORT_RELATIVO, (_, antes, aspas, caminho) => `${antes}${aspas}${caminho}?v=${versao}${aspas}`);
}

/** Coloca (ou troca) a etiqueta nos scripts e folhas de estilo locais do HTML. */
export function versionarHtml(texto, versao) {
  return texto.replace(REF_HTML, (_, antes, caminho) => `${antes}${caminho}?v=${versao}"`);
}

/**
 * Etiqueta curta calculada só a partir do conteúdo (sem as etiquetas antigas),
 * então rodar de novo sem mudar nada dá sempre o mesmo resultado.
 * @param {Array<{caminho: string, texto: string}>} arquivos
 */
export function calcularVersao(arquivos) {
  const hash = createHash('sha256');
  for (const { caminho, texto } of [...arquivos].sort((a, b) => a.caminho.localeCompare(b.caminho))) {
    hash.update(caminho).update('\0').update(texto.replace(ETIQUETA, '').replace(/\r\n/g, '\n')).update('\0');
  }
  return hash.digest('hex').slice(0, 10);
}

function listar(pasta, extensao) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const p = join(pasta, e.name);
    if (e.isDirectory()) return listar(p, extensao);
    return e.name.endsWith(extensao) ? [p] : [];
  });
}

function executar(raiz) {
  const js = listar(join(raiz, 'js'), '.js');
  const css = listar(join(raiz, 'css'), '.css');
  const ler = (p) => ({ p, caminho: relative(raiz, p).split(sep).join('/'), texto: readFileSync(p, 'utf8') });
  const arquivos = [...js, ...css].map(ler);
  const versao = calcularVersao(arquivos);

  let alterados = 0;
  const gravar = (p, antes, depois) => { if (antes !== depois) { writeFileSync(p, depois); alterados++; } };
  for (const a of arquivos.filter((x) => x.p.endsWith('.js'))) gravar(a.p, a.texto, versionarJs(a.texto, versao));
  const html = join(raiz, 'index.html');
  const textoHtml = readFileSync(html, 'utf8');
  gravar(html, textoHtml, versionarHtml(textoHtml, versao));

  console.log(`Versão dos arquivos: ${versao}${alterados ? ` (${alterados} arquivo(s) atualizado(s))` : ''}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  executar(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
}
