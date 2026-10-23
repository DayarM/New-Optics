/**
 * Adaptador de DEMONSTRAÇÃO — guarda tudo no navegador (localStorage).
 * Serve para testar a interface antes de configurar a planilha.
 * Implementa exatamente o mesmo contrato do sheetsAdapter.
 */
import { AppError } from '../../core/erros.js';
import { hojeISO, somarDias, maisRecente } from '../../core/datas.js';

const CHAVE = 'mmcrm.demo.v2';
const espera = () => new Promise((r) => setTimeout(r, 200));
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const agora = () => new Date().toISOString().slice(0, 19);
const clone = (o) => JSON.parse(JSON.stringify(o));

function semente() {
  const hoje = hojeISO();
  const [, mes, dia] = hoje.split('-');
  const base = { data_nascimento: '', ultima_compra: '', proximo_contato: '', motivo_proximo: '', consentimento: true,
    consentimento_em: hoje, observacao: '', origem_lead_id: '', criado_em: agora(), criado_por: 'Demo', atualizado_em: agora(), atualizado_por: 'Demo' };
  const c = (nome, whatsapp, extra) => ({ ...base, id: novoId(), nome, whatsapp, ...extra });
  const clientes = [
    c('Ana Beatriz Lima', '5585999110001', { ultima_compra: somarDias(hoje, -8), observacao: 'Primeiro multifocal' }),
    c('Carlos Henrique Souza', '5585988220002', { ultima_compra: somarDias(hoje, -370) }),
    c('Francisca Moreira', '5585997330003', { proximo_contato: somarDias(hoje, -1), motivo_proximo: 'Retornar: tem interesse' }),
    c('João Pedro Alves', '5585996440004', { data_nascimento: `1990-${mes}-${dia}`, ultima_compra: somarDias(hoje, -90) }),
    c('Larissa Castro', '5585995550005', { ultima_compra: somarDias(hoje, -20) }),
    c('Raimundo Nonato', '5585994660006', { ultima_compra: somarDias(hoje, -8), consentimento: false, consentimento_em: '' }),
    c('Sandra Rocha', '5585993770007', { ultima_compra: somarDias(hoje, -2) }),
  ];
  const compras = clientes.filter((x) => x.ultima_compra).map((x, i) => ({
    id: novoId(), cliente_id: x.id, data: x.ultima_compra, descricao: i % 2 ? 'Óculos de sol' : 'Armação + lentes',
    valor: i % 2 ? '380,00' : '890,00', forma_pagamento: 'Pix', observacao: '', operador: 'Demo', criado_em: agora(),
  }));
  const l = (nome, whatsapp, extra) => ({ id: novoId(), nome, whatsapp, origem: 'Instagram', interesse: 'Óculos infantil',
    status: 'novo', proximo_contato: '', motivo_proximo: '', consentimento: true, consentimento_em: hoje, observacao: '',
    cliente_id: '', criado_em: agora(), criado_por: 'Demo', atualizado_em: agora(), atualizado_por: 'Demo', ...extra });
  const leads = [
    l('Bruna Martins', '5585981110011', { observacao: 'Viu a campanha de óculos infantis' }),
    l('Diego Rocha', '5585982220022', { status: 'em_contato', origem: 'Indicação', interesse: 'Óculos de grau', proximo_contato: hoje, motivo_proximo: 'Retornar: tem interesse' }),
    l('Paula Freitas', '5585983330033', { status: 'agendado', origem: 'Passou na loja', interesse: 'Exame de vista', proximo_contato: somarDias(hoje, 3) }),
    l('Lucas Melo', '5585984440044', { status: 'perdido', origem: 'Campanha', interesse: 'Óculos de sol' }),
  ];
  const resultados = ['interessado', 'nao_respondeu', 'vai_passar', 'resolvido', 'interessado', 'sem_interesse'];
  const contatos = Array.from({ length: 14 }, (_, i) => ({
    id: novoId(), cliente_id: clientes[i % clientes.length].id, lead_id: '', data: somarDias(hoje, -(i % 9) - 1),
    resultado: resultados[i % resultados.length], motivo: 'Pós-venda: saber se está adaptado aos óculos',
    observacao: '', proximo_contato: '', operador: i % 2 ? 'Maria' : 'Yasmin', criado_em: agora(),
  }));
  return { clientes, contatos, compras, receitas: [], leads };
}

export function criarDemoAdapter() {
  let db;
  try { db = JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { db = semente(); }
  const gravar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { throw new AppError('ERRO_SALVAR'); }
  };
  gravar();
  let operador = 'Demo';

  const achar = (lista, id) => {
    const x = db[lista].find((y) => y.id === id);
    if (!x) throw new AppError('NAO_ENCONTRADO');
    return x;
  };
  // Mesma regra do servidor: última compra = data mais recente entre as compras.
  const recalcularUltimaCompra = (cliente) => {
    const datas = db.compras.filter((x) => x.cliente_id === cliente.id).map((x) => x.data);
    if (datas.length) cliente.ultima_compra = maisRecente(datas);
  };
  const carimbo = () => ({ atualizado_em: agora(), atualizado_por: operador });

  return {
    async login(usuario, senha) {
      await espera();
      if (!usuario || !senha) throw new AppError('LOGIN_INVALIDO');
      operador = usuario;
      return { token: 'demo', nome: usuario, expiraEm: Date.now() + 12 * 3600e3 };
    },
    async carregar() {
      await espera();
      return clone(db);
    },
    async salvarCliente(dados) {
      await espera();
      let c;
      if (dados.id) c = Object.assign(achar('clientes', dados.id), dados, carimbo());
      else { c = { ...dados, id: novoId(), criado_em: agora(), criado_por: operador, ...carimbo() }; db.clientes.push(c); }
      gravar();
      return clone(c);
    },
    async excluirCliente(id) {
      await espera();
      achar('clientes', id);
      db.clientes = db.clientes.filter((x) => x.id !== id);
      for (const t of ['contatos', 'compras', 'receitas']) db[t] = db[t].filter((x) => x.cliente_id !== id);
      gravar();
      return { id };
    },
    async registrarContato(dados) {
      await espera();
      const alvo = dados.lead_id ? achar('leads', dados.lead_id) : achar('clientes', dados.cliente_id);
      const contato = { id: novoId(), cliente_id: dados.cliente_id || '', lead_id: dados.lead_id || '', data: hojeISO(),
        resultado: dados.resultado, motivo: dados.motivo, observacao: dados.observacao,
        proximo_contato: dados.proximo_contato || '', operador, criado_em: agora() };
      db.contatos.push(contato);
      alvo.proximo_contato = dados.proximo_contato || '';
      alvo.motivo_proximo = dados.proximo_contato ? dados.motivo_proximo || '' : '';
      if (dados.lead_id && dados.status_lead) alvo.status = dados.status_lead;
      Object.assign(alvo, carimbo());
      gravar();
      return { contato: clone(contato), [dados.lead_id ? 'lead' : 'cliente']: clone(alvo) };
    },
    async salvarCompra(dados) {
      await espera();
      const cliente = achar('clientes', dados.cliente_id);
      const compra = { ...dados, id: novoId(), operador, criado_em: agora() };
      db.compras.push(compra);
      recalcularUltimaCompra(cliente);
      gravar();
      return { compra: clone(compra), cliente: clone(cliente) };
    },
    async salvarReceita(dados) {
      await espera();
      achar('clientes', dados.cliente_id);
      const receita = { ...dados, id: novoId(), operador, criado_em: agora() };
      db.receitas.push(receita);
      gravar();
      return { receita: clone(receita) };
    },
    async excluirRegistro(tipo, id) {
      await espera();
      if (!['compras', 'receitas'].includes(tipo)) throw new AppError('DADOS_INVALIDOS');
      const reg = achar(tipo, id);
      db[tipo] = db[tipo].filter((x) => x.id !== id);
      const cliente = db.clientes.find((x) => x.id === reg.cliente_id);
      if (tipo === 'compras' && cliente) recalcularUltimaCompra(cliente);
      gravar();
      return { cliente: cliente ? clone(cliente) : null };
    },
    async salvarLead(dados) {
      await espera();
      let l;
      if (dados.id) l = Object.assign(achar('leads', dados.id), dados, carimbo());
      else { l = { cliente_id: '', ...dados, id: novoId(), criado_em: agora(), criado_por: operador, ...carimbo() }; db.leads.push(l); }
      gravar();
      return clone(l);
    },
    async excluirLead(id) {
      await espera();
      achar('leads', id);
      db.leads = db.leads.filter((x) => x.id !== id);
      db.contatos = db.contatos.filter((x) => x.lead_id !== id);
      gravar();
      return { id };
    },
    async converterLead(id) {
      await espera();
      const lead = achar('leads', id);
      if (lead.status === 'convertido' && lead.cliente_id) throw new AppError('JA_CONVERTIDO');
      const cliente = { id: novoId(), nome: lead.nome, whatsapp: lead.whatsapp, data_nascimento: '', ultima_compra: '',
        proximo_contato: '', motivo_proximo: '', consentimento: lead.consentimento, consentimento_em: lead.consentimento_em || '',
        observacao: lead.observacao, origem_lead_id: lead.id, criado_em: agora(), criado_por: operador, ...carimbo() };
      db.clientes.push(cliente);
      Object.assign(lead, { status: 'convertido', cliente_id: cliente.id, proximo_contato: '', motivo_proximo: '' }, carimbo());
      gravar();
      return { lead: clone(lead), cliente: clone(cliente) };
    },
  };
}
