/**
 * Testes das funções puras. Rodar com:  npm test   (ou: node --test tests/*.test.js)
 * (Node 18 ou mais novo; não precisa instalar nada.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { REGRAS_RECONTATO } from '../js/config/regras.config.js';
import { avaliarCliente, gerarListaDoDia, calcularReagendamento } from '../js/services/recontatoService.js';
import { normalizarWhatsapp, linkWhatsapp, montarMensagem, formatarWhatsapp } from '../js/services/mensagemService.js';
import { validarCliente, validarReceita, normalizarValor, buscarClientes } from '../js/services/validacoes.js';
import { somarDias, ehAniversario, ehDataISO, diferencaDias } from '../js/core/datas.js';

const HOJE = '2026-10-09';
const cfg = REGRAS_RECONTATO;
const cli = (extra = {}) => ({ id: 'c1', nome: 'Ana Souza', whatsapp: '5585999990001', consentimento: true, ...extra });
const hist = (extra = {}) => ({ contatos: [], compras: [], receitas: [], ...extra });

/* ---------- datas ---------- */
test('datas: validação e aritmética', () => {
  assert.equal(ehDataISO('2026-02-31'), false);
  assert.equal(somarDias('2026-12-30', 3), '2027-01-02');
  assert.equal(diferencaDias('2026-10-01', HOJE), 8);
  assert.equal(ehAniversario('1990-10-09', HOJE), true);
  assert.equal(ehAniversario('2000-02-29', '2027-02-28'), true); // ano não bissexto
});

/* ---------- regras de recontato ---------- */
test('pós-venda aparece 7 dias após a compra', () => {
  const r = avaliarCliente(cli({ ultima_compra: somarDias(HOJE, -7) }), hist(), HOJE, cfg);
  assert.equal(r.regra, 'pos_venda');
  assert.equal(r.diasAtraso, 0);
});

test('pós-venda não aparece antes do prazo', () => {
  assert.equal(avaliarCliente(cli({ ultima_compra: somarDias(HOJE, -6) }), hist(), HOJE, cfg), null);
});

test('pós-venda some depois de contatado', () => {
  const c = cli({ ultima_compra: somarDias(HOJE, -10) });
  const h = hist({ contatos: [{ data: somarDias(HOJE, -2) }] });
  assert.equal(avaliarCliente(c, h, HOJE, cfg), null);
});

test('pós-venda vence após a validade (não lota a lista com antigos)', () => {
  assert.equal(avaliarCliente(cli({ ultima_compra: somarDias(HOJE, -60) }), hist(), HOJE, cfg), null);
});

test('LGPD: sem consentimento nunca entra na lista', () => {
  const c = cli({ consentimento: false, ultima_compra: somarDias(HOJE, -7) });
  assert.equal(avaliarCliente(c, hist(), HOJE, cfg), null);
});

test('revisão anual usa a receita mais recente se for depois da compra', () => {
  const c = cli({ ultima_compra: somarDias(HOJE, -400) });
  assert.equal(avaliarCliente(c, hist(), HOJE, cfg).regra, 'revisao_anual');
  const comReceita = hist({ receitas: [{ data: somarDias(HOJE, -100) }] });
  assert.equal(avaliarCliente(c, comReceita, HOJE, cfg), null);
});

test('retorno agendado vencido aparece com o motivo salvo', () => {
  const c = cli({ proximo_contato: somarDias(HOJE, -1), motivo_proximo: 'Retornar: cliente tem interesse' });
  const r = avaliarCliente(c, hist(), HOJE, cfg);
  assert.equal(r.regra, 'retorno_agendado');
  assert.equal(r.motivo, 'Retornar: cliente tem interesse');
});

test('retorno futuro segura regras automáticas, mas não o aniversário', () => {
  const futuro = { proximo_contato: somarDias(HOJE, 5), ultima_compra: somarDias(HOJE, -7) };
  assert.equal(avaliarCliente(cli(futuro), hist(), HOJE, cfg), null);
  const r = avaliarCliente(cli({ ...futuro, data_nascimento: '1985-10-09' }), hist(), HOJE, cfg);
  assert.equal(r.regra, 'aniversario');
});

test('regra desligada no config não dispara', () => {
  const semPos = { ...cfg, regras: cfg.regras.map((r) => (r.chave === 'pos_venda' ? { ...r, ativa: false } : r)) };
  assert.equal(avaliarCliente(cli({ ultima_compra: somarDias(HOJE, -7) }), hist(), HOJE, semPos), null);
});

test('lista do dia ordena por prioridade e depois por atraso', () => {
  const clientes = [
    cli({ id: 'a', nome: 'Revisão', ultima_compra: somarDias(HOJE, -370) }),
    cli({ id: 'b', nome: 'Pós antigo', ultima_compra: somarDias(HOJE, -20) }),
    cli({ id: 'c', nome: 'Pós novo', ultima_compra: somarDias(HOJE, -8) }),
    cli({ id: 'd', nome: 'Retorno', proximo_contato: HOJE }),
    cli({ id: 'e', nome: 'Nada', ultima_compra: somarDias(HOJE, -100) }),
  ];
  const lista = gerarListaDoDia(clientes, { contatos: [], compras: [], receitas: [] }, HOJE, cfg);
  assert.deepEqual(lista.map((x) => x.cliente.id), ['d', 'b', 'c', 'a']);
});

test('reagendamento segue o config de resultados', () => {
  assert.deepEqual(calcularReagendamento('nao_respondeu', HOJE, cfg),
    { proximo_contato: somarDias(HOJE, 30), motivo_proximo: 'Nova tentativa: não respondeu antes' });
  assert.deepEqual(calcularReagendamento('resolvido', HOJE, cfg), { proximo_contato: '', motivo_proximo: '' });
});

/* ---------- WhatsApp ---------- */
test('normaliza número e monta link wa.me', () => {
  assert.equal(normalizarWhatsapp('(85) 98861-8282'), '5585988618282');
  assert.equal(normalizarWhatsapp('085 98861-8282'), '5585988618282');
  assert.equal(normalizarWhatsapp('123'), '');
  assert.equal(formatarWhatsapp('5585988618282'), '(85) 98861-8282');
  const msg = montarMensagem('Olá, {primeiroNome}! Aqui é da {loja}.', { nome: 'ANA souza' }, { nome: 'MM Ótica' });
  assert.equal(msg, 'Olá, Ana! Aqui é da MM Ótica.');
  assert.match(linkWhatsapp('85988618282', msg), /^https:\/\/wa\.me\/5585988618282\?text=Ol%C3%A1/);
});

/* ---------- validações ---------- */
test('valida cliente', () => {
  const { erros } = validarCliente({ nome: 'A', whatsapp: '99' }, { hoje: HOJE });
  assert.ok(erros.nome && erros.whatsapp);
  const ok = validarCliente({ nome: '  Ana   Souza ', whatsapp: '85 98861 8282', consentimento: true }, { hoje: HOJE });
  assert.deepEqual(ok.erros, {});
  assert.equal(ok.valor.nome, 'Ana Souza');
});

test('valor em reais e receita', () => {
  assert.equal(normalizarValor('1.250,9'), '1250,90');
  assert.equal(normalizarValor('R$ 80'), '80,00');
  assert.equal(normalizarValor('abc,'), null);
  const r = validarReceita({ data: HOJE, od_esferico: '-2.25', od_eixo: '190' }, { hoje: HOJE });
  assert.equal(r.valor.od_esferico, '-2,25');
  assert.ok(r.erros.od_eixo);
});

test('busca ignora acentos e aceita telefone', () => {
  const lista = [cli({ id: '1', nome: 'João Araújo', whatsapp: '5585911112222' }), cli({ id: '2', nome: 'Maria', whatsapp: '5585933334444' })];
  assert.deepEqual(buscarClientes(lista, 'joao').map((c) => c.id), ['1']);
  assert.deepEqual(buscarClientes(lista, '3333').map((c) => c.id), ['2']);
});
