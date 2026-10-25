/**
 * Testes de leads, indicadores e utilitários novos.  Rodar com: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGRAS_RECONTATO } from '../js/config/regras.config.js';
import { OPCOES } from '../js/config/textos.config.js';
import { avaliarLead, gerarListaDoDia, statusLeadAposContato } from '../js/services/recontatoService.js';
import { calcularIndicadores, valorNumerico, diasDoPeriodo } from '../js/services/indicadoresService.js';
import { validarLead, validarCliente, gerarCSV, lerConsentimento } from '../js/services/validacoes.js';
import { somarDias } from '../js/core/datas.js';

const HOJE = '2026-10-23';
const cfg = REGRAS_RECONTATO;
const lead = (extra = {}) => ({ id: 'l1', nome: 'Bruna', whatsapp: '5585981110011', status: 'novo',
  consentimento: true, criado_em: `${HOJE}T09:00:00`, proximo_contato: '', ...extra });

test('lead novo sem contato aparece hoje', () => {
  const r = avaliarLead(lead(), [], HOJE, cfg);
  assert.equal(r.regra, 'lead_novo');
});

test('lead novo já contatado não aparece como novo', () => {
  assert.equal(avaliarLead(lead(), [{ data: HOJE }], HOJE, cfg), null);
});

test('lead com retorno vencido aparece; futuro não', () => {
  assert.equal(avaliarLead(lead({ status: 'em_contato', proximo_contato: HOJE }), [], HOJE, cfg).regra, 'lead_retorno');
  assert.equal(avaliarLead(lead({ status: 'em_contato', proximo_contato: somarDias(HOJE, 2) }), [], HOJE, cfg), null);
});

test('lead convertido, perdido ou sem autorização nunca aparece', () => {
  assert.equal(avaliarLead(lead({ status: 'convertido', proximo_contato: HOJE }), [], HOJE, cfg), null);
  assert.equal(avaliarLead(lead({ status: 'perdido' }), [], HOJE, cfg), null);
  assert.equal(avaliarLead(lead({ consentimento: false }), [], HOJE, cfg), null);
});

test('lead novo antigo vence depois da validade', () => {
  assert.equal(avaliarLead(lead({ criado_em: somarDias(HOJE, -45) }), [], HOJE, cfg), null);
});

test('lista do dia mistura clientes e leads em ordem de prioridade', () => {
  const clientes = [{ id: 'c1', nome: 'Ana', whatsapp: '5585999990001', consentimento: true, ultima_compra: somarDias(HOJE, -7) }];
  const leads = [lead(), lead({ id: 'l2', nome: 'Diego', status: 'em_contato', proximo_contato: HOJE })];
  const lista = gerarListaDoDia(clientes, { contatos: [], compras: [], receitas: [], leads }, HOJE, cfg);
  assert.deepEqual(lista.map((x) => `${x.tipo}:${x.pessoa.id}`), ['lead:l2', 'cliente:c1', 'lead:l1']);
});

test('status do lead após contato', () => {
  assert.equal(statusLeadAposContato('novo', 'interessado', cfg), 'em_contato');
  assert.equal(statusLeadAposContato('em_contato', 'vai_passar', cfg), 'agendado');
  assert.equal(statusLeadAposContato('agendado', 'sem_interesse', cfg), 'perdido');
  assert.equal(statusLeadAposContato('convertido', 'sem_interesse', cfg), 'convertido');
});

test('consentimento Sim/Não é obrigatório', () => {
  assert.equal(lerConsentimento('sim'), true);
  assert.equal(lerConsentimento('nao'), false);
  assert.equal(lerConsentimento(undefined), null);
  assert.ok(validarCliente({ nome: 'Ana', whatsapp: '85988618282' }, { hoje: HOJE }).erros.consentimento);
  assert.deepEqual(validarLead({ nome: 'Ana', whatsapp: '85988618282', consentimento: 'nao' }, { hoje: HOJE }).erros, {});
});

test('indicadores do período', () => {
  const dados = {
    clientes: [{ consentimento: true }, { consentimento: false }],
    contatos: [
      { data: HOJE, resultado: 'interessado', operador: 'Maria' },
      { data: somarDias(HOJE, -3), resultado: 'nao_respondeu', operador: 'Yasmin' },
      { data: somarDias(HOJE, -10), resultado: 'interessado', operador: 'Maria' },
    ],
    compras: [{ data: HOJE, valor: '1.250,90' }, { data: somarDias(HOJE, -40), valor: '100,00' }],
    leads: [
      { status: 'novo', criado_em: `${HOJE}T10:00:00` },
      { status: 'convertido', criado_em: somarDias(HOJE, -20), atualizado_em: `${somarDias(HOJE, -1)}T10:00:00` },
    ],
  };
  const i = calcularIndicadores(dados, { hoje: HOJE, dias: 7, pendentesHoje: 4,
    resultados: cfg.resultados, statusLead: OPCOES.statusLead });
  assert.equal(i.contatosFeitos, 2);
  assert.equal(i.contatosPorDia.length, 7);
  assert.equal(i.contatosPorDia.at(-1).total, 1);
  assert.equal(i.contatosPorResultado.find((r) => r.chave === 'interessado').total, 1);
  assert.equal(i.leadsNovos, 1);
  assert.equal(i.leadsConvertidos, 1);
  assert.equal(i.taxaConversao, 50);
  assert.equal(i.comprasQtd, 1);
  assert.equal(i.comprasValor, 1250.9);
  assert.equal(i.semAutorizacao, 1);
  assert.equal(i.pendentesHoje, 4);
});

test('utilitários: valor, período e CSV', () => {
  assert.equal(valorNumerico('R$ 1.250,90'), 1250.9);
  assert.deepEqual(diasDoPeriodo(HOJE, 3), ['2026-10-21', '2026-10-22', '2026-10-23']);
  const csv = gerarCSV([{ nome: 'Ana; "Bia"', ok: true, obs: '=1+1' }], [['nome', 'Nome'], ['ok', 'Ok'], ['obs', 'Obs']]);
  assert.equal(csv, '\ufeffNome;Ok;Obs\r\n"Ana; ""Bia""";Sim;\'=1+1');
  // Tabula\u00e7\u00e3o no in\u00edcio tamb\u00e9m vira texto (evita f\u00f3rmula escondida no Excel).
  assert.equal(gerarCSV([{ obs: '\t=HYPERLINK("x")' }], [['obs', 'Obs']]), '\ufeffObs\r\n"\'\t=HYPERLINK(""x"")"');
});

test('avatar: iniciais e cor estável', async () => {
  const { iniciais, corAvatar, CORES_AVATAR } = await import('../js/services/avatarService.js');
  assert.equal(iniciais('ana beatriz lima'), 'AL');
  assert.equal(iniciais('  Maria  '), 'M');
  assert.equal(iniciais('Érica de Souza'), 'ÉS');
  assert.equal(iniciais(''), '?');
  assert.equal(corAvatar('Yasmin'), corAvatar('Yasmin'));
  for (const s of ['', 'a', 'Maria', 'id-123']) assert.ok(corAvatar(s) >= 0 && corAvatar(s) < CORES_AVATAR);
});
