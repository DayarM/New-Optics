/**
 * Componentes reutilizáveis de interface.
 */
import { h, mostrarErrosCampos } from '../../core/dom.js';
import { AppError, mensagemAmigavel } from '../../core/erros.js';
import { icone } from './icones.js';

/** Conteúdo de botão/link com ícone + texto, sempre alinhados e com 8px de espaço. */
export function comIcone(nome, texto) {
  return [icone(nome), h('span', {}, texto)];
}

/**
 * Grupo de opções (radio) com caixas do mesmo tamanho e texto centralizado.
 * @param {{nome, rotulo, opcoes: Array<{valor, rotulo}>, valor, ajuda?, colunas?}} p
 */
export function campoOpcoes({ nome, rotulo, opcoes, valor = '', ajuda, colunas = 2 }) {
  return h('fieldset', { class: `grupo-opcoes cols-${colunas}` },
    h('legend', {}, rotulo),
    opcoes.map((o) => h('label', { class: 'opcao' },
      h('input', { type: 'radio', name: nome, value: o.valor, checked: o.valor === valor }),
      h('span', {}, o.rotulo))),
    ajuda && h('p', { class: 'campo-ajuda' }, ajuda));
}

/** Pergunta de consentimento LGPD (Sim/Não obrigatória). */
export function campoConsentimento(rotulo, valorAtual, ajuda) {
  const valor = valorAtual === true ? 'sim' : valorAtual === false ? 'nao' : '';
  return campoOpcoes({ nome: 'consentimento', rotulo, valor, ajuda,
    opcoes: [{ valor: 'sim', rotulo: 'Sim, autorizou' }, { valor: 'nao', rotulo: 'Não autorizou' }] });
}

/** Faixa decorativa com a foto da campanha (telas Clientes e Cadastrar). */
export function faixaCampanha(titulo, subtitulo) {
  return h('header', { class: 'faixa-campanha' },
    h('div', { class: 'faixa-texto' },
      h('h1', { class: 'titulo-tela' }, titulo),
      subtitulo && h('p', { class: 'contagem' }, subtitulo)));
}

/** Botão principal de cadastro: flutuante no celular, normal no tablet/notebook. */
export function botaoNovo(rotulo, href) {
  return h('a', { class: 'btn btn-principal btn-novo', href }, ...comIcone('plus', rotulo));
}

/** Filtro em "chips" (escolha única). */
export function chips({ rotulo, opcoes, valor, aoMudar }) {
  const grupo = h('div', { class: 'chips', role: 'group', 'aria-label': rotulo });
  const desenhar = (atual) => grupo.replaceChildren(...opcoes.map((o) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(o.valor === atual),
    onclick: () => { desenhar(o.valor); aoMudar(o.valor); },
  }, o.rotulo)));
  desenhar(valor);
  return grupo;
}

/* ---------- Aviso (toast) — lido por leitores de tela via aria-live ---------- */
let timerAviso;
export function avisar(texto, tipo = 'ok') {
  const area = document.getElementById('aviso');
  clearTimeout(timerAviso);
  area.replaceChildren(h('div', { class: `aviso aviso-${tipo}` }, texto));
  timerAviso = setTimeout(() => area.replaceChildren(), tipo === 'erro' ? 6000 : 3000);
}

/* ---------- Tratador central de erros das telas ---------- */
let aoExpirarSessao = () => {};
export function configurarExpiracao(fn) { aoExpirarSessao = fn; }

/**
 * Mostra o erro em linguagem simples. Se houver `form`, destaca os campos.
 * @param {unknown} erro
 * @param {{form?: HTMLFormElement, padrao?: string}} [opcoes]
 */
export function tratarErro(erro, { form, padrao } = {}) {
  if (erro instanceof AppError && erro.codigo === 'SESSAO_EXPIRADA') {
    avisar(mensagemAmigavel(erro), 'erro');
    aoExpirarSessao();
    return;
  }
  if (form && erro instanceof AppError && erro.extra?.campos) mostrarErrosCampos(form, erro.extra.campos);
  avisar(mensagemAmigavel(erro, padrao), 'erro');
}

/* ---------- Botão que trava enquanto salva (evita clique duplo) ---------- */
export async function comCarregamento(botao, textoCarregando, acao) {
  const original = [...botao.childNodes]; // guarda ícone + texto
  botao.disabled = true;
  botao.setAttribute('aria-busy', 'true');
  botao.replaceChildren(h('span', {}, textoCarregando));
  try {
    return await acao();
  } finally {
    botao.disabled = false;
    botao.removeAttribute('aria-busy');
    botao.replaceChildren(...original);
  }
}

/* ---------- Campos de formulário ---------- */
let seq = 0;
/**
 * Campo com rótulo visível. `tipo` = text | tel | date | textarea | select | checkbox | password
 */
export function campo({ nome, rotulo, tipo = 'text', valor = '', obrigatorio = false, ajuda, opcoes, attrs = {}, classe = '' }) {
  const id = `c-${nome}-${++seq}`;
  const ajudaId = ajuda ? `${id}-ajuda` : null;
  const base = { id, name: nome, 'aria-describedby': ajudaId, required: obrigatorio, ...attrs };

  if (tipo === 'checkbox') {
    return h('div', { class: `campo campo-check ${classe}` },
      h('input', { ...base, type: 'checkbox', checked: Boolean(valor) }),
      h('label', { for: id }, rotulo),
      ajuda && h('p', { class: 'campo-ajuda', id: ajudaId }, ajuda));
  }

  let input;
  if (tipo === 'textarea') input = h('textarea', { ...base, rows: 3 }, valor);
  else if (tipo === 'select') {
    input = h('select', base,
      h('option', { value: '' }, 'Escolha…'),
      opcoes.map((o) => h('option', { value: o, selected: o === valor }, o)));
  } else input = h('input', { ...base, type: tipo, value: valor ?? '' });

  return h('div', { class: `campo ${classe}` },
    h('label', { for: id }, rotulo, obrigatorio ? '' : h('span', { class: 'opcional' }, ' (opcional)')),
    input,
    ajuda && h('p', { class: 'campo-ajuda', id: ajudaId }, ajuda));
}

/** Agrupa campos secundários: escondidos por padrão, abrem com um toque. */
export function maisDetalhes(...campos) {
  return h('details', { class: 'mais-detalhes' }, h('summary', {}, 'Mais detalhes'), ...campos);
}

/* ---------- Painel deslizante (bottom sheet) baseado em <dialog> ---------- */
/**
 * Abre um painel. `conteudo(fechar)` monta o corpo e recebe a função de fechar.
 * Retorna { fechar, dialogo }.
 */
export function abrirPainel(titulo, conteudo) {
  const dlg = h('dialog', { class: 'painel', 'aria-label': titulo });
  const fechar = () => { dlg.close(); };
  dlg.addEventListener('close', () => dlg.remove());
  // Toque fora do conteúdo fecha o painel.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) fechar(); });
  dlg.append(
    h('div', { class: 'painel-corpo' },
      h('header', { class: 'painel-topo' },
        h('h2', {}, titulo),
        h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar', onclick: fechar }, icone('x'))),
      conteudo(fechar)));
  document.body.append(dlg);
  dlg.showModal();
  return { fechar, dialogo: dlg };
}

/** Confirmação simples. Resolve true/false. */
export function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
  return new Promise((resolve) => {
    let resposta = false;
    const { dialogo } = abrirPainel(titulo, (fechar) => h('div', { class: 'confirmar' },
      h('p', {}, texto),
      h('div', { class: 'acoes' },
        h('button', { type: 'button', class: perigo ? 'btn btn-perigo' : 'btn btn-principal', onclick: () => { resposta = true; fechar(); } }, botao),
        h('button', { type: 'button', class: 'btn btn-secundario', onclick: fechar }, 'Cancelar'))));
    // Fechar pelo X, pela tecla Esc ou tocando fora conta como "não".
    dialogo.addEventListener('close', () => resolve(resposta));
  });
}

/** Estado de carregamento padrão de uma tela. */
export function carregando(texto = 'Carregando…') {
  return h('p', { class: 'estado', role: 'status' }, texto);
}

/** Estado de erro com botão de tentar de novo. */
export function falhaCarregar(erro, tentarDeNovo) {
  return h('div', { class: 'estado' },
    h('p', {}, mensagemAmigavel(erro, 'ERRO_CARREGAR')),
    h('button', { class: 'btn btn-secundario', type: 'button', onclick: tentarDeNovo }, ...comIcone('refresh', 'Tentar de novo')));
}
