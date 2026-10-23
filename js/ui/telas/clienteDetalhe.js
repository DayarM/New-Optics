/**
 * TELA: Ficha do cliente.
 * Reúne dados, compras, receitas e histórico de contatos.
 * Ação principal: chamar no WhatsApp.
 */
import { h, montar, lerFormulario } from '../../core/dom.js';
import { irPara } from '../../core/router.js';
import { clientesService } from '../../services/clientesService.js';
import { formatarWhatsapp } from '../../services/mensagemService.js';
import { ehVerdadeiro } from '../../services/recontatoService.js';
import { REGRAS_RECONTATO } from '../../config/regras.config.js';
import { TEXTOS, OPCOES } from '../../config/textos.config.js';
import { formatarData, hojeISO, distanciaTexto } from '../../core/datas.js';
import {
  carregando, falhaCarregar, avisar, tratarErro, comCarregamento,
  campo, maisDetalhes, abrirPainel, confirmar, comIcone,
} from '../componentes/ui.js';
import { abrirPainelContato } from '../componentes/painelContato.js';

let abaAtiva = 'compras';

export async function telaClienteDetalhe(container, { id }) {
  montar(container, carregando());
  let d;
  try {
    d = await clientesService.detalhe(id);
  } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaClienteDetalhe(container, { id })));
    return;
  }
  const recarregar = () => telaClienteDetalhe(container, { id });
  const { cliente } = d;
  const hoje = hojeISO();
  const link = clientesService.linkContato(cliente);
  const autorizado = ehVerdadeiro(cliente.consentimento);

  const topo = h('section', { class: 'ficha' },
    h('h1', { class: 'titulo-tela' }, cliente.nome),
    h('p', { class: 'ficha-tel num' }, formatarWhatsapp(cliente.whatsapp)),
    h('dl', { class: 'ficha-dados' },
      item('Última compra', cliente.ultima_compra ? formatarData(cliente.ultima_compra) : 'Não informada'),
      item('Próximo contato', cliente.proximo_contato
        ? `${formatarData(cliente.proximo_contato)} (${distanciaTexto(cliente.proximo_contato, hoje)})`
        : 'Automático'),
      cliente.data_nascimento && item('Nascimento', formatarData(cliente.data_nascimento)),
      item('Mensagens', autorizado ? 'Autorizadas' : 'Sem autorização')),
    cliente.observacao && h('p', { class: 'ficha-obs' }, cliente.observacao),
    h('div', { class: 'acoes' },
      link && autorizado
        ? h('a', { class: 'btn btn-whatsapp', href: link, target: '_blank', rel: 'noopener' }, ...comIcone('message', 'Chamar no WhatsApp'))
        : h('p', { class: 'aviso-inline' }, autorizado ? 'Número de WhatsApp inválido. Edite o cadastro.' : TEXTOS.consentimentoAjuda),
      autorizado && h('button', { class: 'btn btn-secundario', type: 'button',
        onclick: () => abrirPainelContato(cliente, 'Contato pela ficha', recarregar) }, ...comIcone('check', 'Contatei')),
      h('a', { class: 'btn btn-secundario', href: `#/clientes/${encodeURIComponent(id)}/editar` }, ...comIcone('pencil', 'Editar'))));

  /* ----- Abas: Compras | Receitas | Contatos ----- */
  const abas = [
    { chave: 'compras', rotulo: `Compras (${d.compras.length})`, corpo: () => secaoCompras(cliente, d.compras, recarregar) },
    { chave: 'receitas', rotulo: `Receitas (${d.receitas.length})`, corpo: () => secaoReceitas(cliente, d.receitas, recarregar) },
    { chave: 'contatos', rotulo: `Contatos (${d.contatos.length})`, corpo: () => secaoContatos(d.contatos) },
  ];
  const painelAba = h('div', { class: 'aba-conteudo', role: 'tabpanel', id: 'aba-painel' });
  const botoesAba = abas.map((a) => h('button', {
    type: 'button', role: 'tab', class: 'aba', id: `aba-${a.chave}`, 'aria-controls': 'aba-painel',
    'aria-selected': String(a.chave === abaAtiva),
    onclick: () => { abaAtiva = a.chave; trocar(); },
  }, a.rotulo));
  const trocar = () => {
    botoesAba.forEach((b, i) => b.setAttribute('aria-selected', String(abas[i].chave === abaAtiva)));
    painelAba.setAttribute('aria-labelledby', `aba-${abaAtiva}`);
    montar(painelAba, (abas.find((a) => a.chave === abaAtiva) || abas[0]).corpo());
  };

  /* ----- LGPD: exclusão definitiva ----- */
  const zonaExclusao = h('section', { class: 'zona-exclusao' },
    h('h2', {}, 'Excluir cliente'),
    h('p', {}, 'Use quando o cliente pedir para apagar os dados dele (LGPD).'),
    h('button', { class: 'btn btn-perigo-contorno', type: 'button', onclick: async (e) => {
      const ok = await confirmar({ titulo: `Excluir ${cliente.nome}?`, texto: TEXTOS.exclusaoAviso, botao: 'Excluir definitivamente', perigo: true });
      if (!ok) return;
      try {
        await comCarregamento(e.target.closest('button'), 'Excluindo…', () => clientesService.excluirCliente(cliente.id));
        avisar('Cliente excluído.');
        irPara('/clientes');
      } catch (erro) { tratarErro(erro, { padrao: 'ERRO_EXCLUIR' }); }
    } }, ...comIcone('trash', 'Excluir cliente e histórico')));

  montar(container,
    h('a', { class: 'voltar', href: '#/clientes' }, ...comIcone('chevronLeft', 'Clientes')),
    topo,
    h('div', { class: 'abas', role: 'tablist', 'aria-label': 'Histórico do cliente' }, botoesAba),
    painelAba,
    zonaExclusao);
  trocar();
}

function item(rotulo, valor) {
  return h('div', {}, h('dt', {}, rotulo), h('dd', {}, valor));
}

/* =================== COMPRAS =================== */
function secaoCompras(cliente, compras, recarregar) {
  return [
    h('button', { class: 'btn btn-principal', type: 'button', onclick: () => painelCompra(cliente, recarregar) }, ...comIcone('plus', 'Registrar compra')),
    compras.length
      ? h('ul', { class: 'registros' }, compras.map((c) => h('li', { class: 'registro' },
          h('div', {},
            h('p', { class: 'registro-titulo' }, c.descricao),
            h('p', { class: 'registro-sub' }, formatarData(c.data),
              c.valor && h('span', {}, `R$ ${c.valor}`),
              c.forma_pagamento && h('span', { class: 'so-tela-grande' }, c.forma_pagamento)),
            c.observacao && h('p', { class: 'registro-obs so-tela-grande' }, c.observacao)),
          botaoExcluirRegistro('compras', c.id, 'esta compra', recarregar))))
      : h('p', { class: 'estado' }, 'Nenhuma compra registrada.'),
  ];
}

function painelCompra(cliente, recarregar) {
  abrirPainel('Registrar compra', (fechar) => {
    const form = h('form', { class: 'form', novalidate: true },
      campo({ nome: 'descricao', rotulo: 'O que comprou', obrigatorio: true, attrs: { placeholder: 'Ex.: armação + lentes multifocais' } }),
      campo({ nome: 'data', rotulo: 'Data', tipo: 'date', valor: hojeISO(), obrigatorio: true, attrs: { max: hojeISO() } }),
      campo({ nome: 'valor', rotulo: 'Valor (R$)', attrs: { inputmode: 'decimal', placeholder: '0,00' } }),
      maisDetalhes(
        campo({ nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'select', opcoes: OPCOES.formasPagamento }),
        campo({ nome: 'observacao', rotulo: 'Observação', tipo: 'textarea' })),
      h('button', { class: 'btn btn-principal', type: 'submit' }, 'Salvar compra'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await comCarregamento(form.querySelector('[type=submit]'), 'Salvando…', () =>
          clientesService.salvarCompra({ ...lerFormulario(form), cliente_id: cliente.id }));
        fechar(); avisar('Compra salva.'); recarregar();
      } catch (erro) { tratarErro(erro, { form, padrao: 'ERRO_SALVAR' }); }
    });
    return form;
  });
}

/* =================== RECEITAS =================== */
const OLHOS = [['od', 'Olho direito (OD)'], ['oe', 'Olho esquerdo (OE)']];

function secaoReceitas(cliente, receitas, recarregar) {
  return [
    h('button', { class: 'btn btn-principal', type: 'button', onclick: () => painelReceita(cliente, recarregar) }, ...comIcone('plus', 'Registrar receita')),
    receitas.length
      ? h('ul', { class: 'registros' }, receitas.map((r) => h('li', { class: 'registro' },
          h('div', { class: 'registro-receita' },
            h('p', { class: 'registro-titulo' }, `Receita de ${formatarData(r.data)}`, r.medico && h('span', { class: 'registro-sub so-tela-grande' }, ` ${r.medico}`)),
            tabelaReceita(r),
            r.observacao && h('p', { class: 'registro-obs' }, r.observacao)),
          botaoExcluirRegistro('receitas', r.id, 'esta receita', recarregar))))
      : h('p', { class: 'estado' }, 'Nenhuma receita registrada.'),
  ];
}

function tabelaReceita(r) {
  return h('div', { class: 'tabela-rolagem' },
    h('table', { class: 'tabela-receita' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, ''), ['Esférico', 'Cilíndrico', 'Eixo', 'DNP'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, OLHOS.map(([o]) => h('tr', {},
        h('th', { scope: 'row' }, o.toUpperCase()),
        h('td', {}, r[`${o}_esferico`] || '–'),
        h('td', {}, r[`${o}_cilindrico`] || '–'),
        h('td', {}, r[`${o}_eixo`] ? `${r[`${o}_eixo`]}°` : '–'),
        h('td', {}, r[`dnp_${o}`] || '–')))),
      r.adicao && h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, 'Adição'), h('td', { colspan: 4 }, r.adicao)))));
}

function painelReceita(cliente, recarregar) {
  abrirPainel('Registrar receita', (fechar) => {
    const grau = (nome, rotulo) => campo({ nome, rotulo, classe: 'campo-curto', attrs: { autocomplete: 'off', placeholder: '0,00' } });
    const eixo = (nome) => campo({ nome, rotulo: 'Eixo', classe: 'campo-curto', attrs: { inputmode: 'numeric', autocomplete: 'off', placeholder: '0–180' } });

    const form = h('form', { class: 'form', novalidate: true },
      campo({ nome: 'data', rotulo: 'Data da receita', tipo: 'date', valor: hojeISO(), obrigatorio: true, attrs: { max: hojeISO() } }),
      OLHOS.map(([o, rotulo]) => h('fieldset', { class: 'grupo-olho' },
        h('legend', {}, rotulo),
        h('div', { class: 'linha-grau' },
          grau(`${o}_esferico`, 'Esférico'), grau(`${o}_cilindrico`, 'Cilíndrico'), eixo(`${o}_eixo`)))),
      campo({ nome: 'adicao', rotulo: 'Adição (perto)', classe: 'campo-curto', attrs: { autocomplete: 'off', placeholder: '+2,00' } }),
      maisDetalhes(
        h('div', { class: 'linha-grau' },
          campo({ nome: 'dnp_od', rotulo: 'DNP OD', classe: 'campo-curto', attrs: { inputmode: 'decimal' } }),
          campo({ nome: 'dnp_oe', rotulo: 'DNP OE', classe: 'campo-curto', attrs: { inputmode: 'decimal' } })),
        campo({ nome: 'medico', rotulo: 'Médico(a)' }),
        campo({ nome: 'observacao', rotulo: 'Observação', tipo: 'textarea' })),
      h('button', { class: 'btn btn-principal', type: 'submit' }, 'Salvar receita'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await comCarregamento(form.querySelector('[type=submit]'), 'Salvando…', () =>
          clientesService.salvarReceita({ ...lerFormulario(form), cliente_id: cliente.id }));
        fechar(); avisar('Receita salva.'); recarregar();
      } catch (erro) { tratarErro(erro, { form, padrao: 'ERRO_SALVAR' }); }
    });
    return form;
  });
}

/* =================== CONTATOS =================== */
function secaoContatos(contatos) {
  const rotulos = Object.fromEntries(REGRAS_RECONTATO.resultados.map((r) => [r.chave, r.rotulo]));
  if (!contatos.length) return h('p', { class: 'estado' }, 'Nenhum contato registrado.');
  return h('ul', { class: 'registros' }, contatos.map((c) => h('li', { class: 'registro' },
    h('div', {},
      h('p', { class: 'registro-titulo' }, rotulos[c.resultado] || c.resultado),
      h('p', { class: 'registro-sub' }, h('span', { class: 'num' }, formatarData(c.data)),
        c.operador && h('span', {}, c.operador),
        c.motivo && h('span', { class: 'so-tela-grande' }, c.motivo)),
      c.observacao && h('p', { class: 'registro-obs' }, c.observacao)))));
}

/* =================== util =================== */
function botaoExcluirRegistro(tipo, id, descricao, recarregar) {
  return h('button', { class: 'btn-texto btn-texto-perigo', type: 'button', onclick: async (e) => {
    const ok = await confirmar({ titulo: `Excluir ${descricao}?`, texto: 'Use só para corrigir um lançamento feito por engano.', botao: 'Excluir', perigo: true });
    if (!ok) return;
    try {
      await comCarregamento(e.target.closest('button'), 'Excluindo…', () => clientesService.excluirRegistro(tipo, id));
      avisar('Registro excluído.'); recarregar();
    } catch (erro) { tratarErro(erro, { padrao: 'ERRO_EXCLUIR' }); }
  } }, ...comIcone('trash', 'Excluir'));
}
