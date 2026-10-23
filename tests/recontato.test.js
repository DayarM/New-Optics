import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECONTATO_CONFIG } from '../js/config/recontato.config.js';
import {
  avaliarCliente, montarListaDoDia, vencimentoReceita, montarMensagem, montarDetalhe,
} from '../js/services/recontato.js';

const HOJE = '2026-10-14';
const cfg = RECONTATO_CONFIG;
const cli = (extra) => ({
  id: extra.id || 'c1', nome: 'Ana Beatriz Lima', whatsapp: '5585999110001',
  consentimento: 'SIM', naoQuerContato: 'NAO', dataUltimaCompra: '', dataReceita: '', dataNascimento: '', ...extra,
});
const contato = (extra) => ({ clienteId: 'c1', dataHora: `${extra.dia}T12:00:00Z`, ...extra });
const comAniversario = { ...cfg, regras: cfg.regras.map((r) => (r.id === 'aniversario' ? { ...r, ativa: true } : r)) };

test('adaptação: aparece no D+7, não no D+6, some depois da janela', () => {
  assert.equal(avaliarCliente(cli({ dataUltimaCompra: '2026-10-07' }), [], HOJE, cfg)?.regra.id, 'adaptacao');
  assert.equal(avaliarCliente(cli({ dataUltimaCompra: '2026-10-08' }), [], HOJE, cfg), null);
  assert.equal(avaliarCliente(cli({ dataUltimaCompra: '2026-09-15' }), [], HOJE, cfg), null); // D+29
});

test('receita: vencendo 30 dias antes e vencida no vencimento', () => {
  assert.equal(avaliarCliente(cli({ dataReceita: '2025-11-10', dataUltimaCompra: '2025-11-10' }), [], HOJE, cfg)?.regra.id, 'receita_vencendo');
  assert.equal(avaliarCliente(cli({ dataReceita: '2025-10-14', dataUltimaCompra: '2025-10-14' }), [], HOJE, cfg)?.regra.id, 'receita_vencida');
  assert.equal(avaliarCliente(cli({ dataReceita: '2025-12-20', dataUltimaCompra: '2025-12-20' }), [], HOJE, cfg), null);
});

test('sem data da receita, usa a última compra', () => {
  assert.equal(vencimentoReceita(cli({ dataUltimaCompra: '2025-09-01' }), cfg.validadeReceita), '2026-09-01');
});

test('criança menor de 7 anos: validade de 6 meses', () => {
  const c = cli({ dataNascimento: '2021-05-01', dataReceita: '2026-04-01' });
  assert.equal(vencimentoReceita(c, cfg.validadeReceita), '2026-10-01');
  assert.equal(avaliarCliente(c, [], HOJE, cfg)?.regra.id, 'receita_vencida');
});

test('LGPD: sem consentimento ou "não quer contato" nunca aparece', () => {
  assert.equal(avaliarCliente(cli({ consentimento: 'NAO', dataUltimaCompra: '2026-10-07' }), [], HOJE, cfg), null);
  assert.equal(avaliarCliente(cli({ consentimento: '', dataUltimaCompra: '2026-10-07' }), [], HOJE, cfg), null);
  assert.equal(avaliarCliente(cli({ naoQuerContato: 'SIM', dataUltimaCompra: '2026-10-07' }), [], HOJE, cfg), null);
  // Mesmo que o cadastro não tenha sido atualizado, o histórico "nao_quer" bloqueia.
  const k = [contato({ dia: '2026-01-01', resultado: 'nao_quer', chaveCiclo: 'x' })];
  assert.equal(avaliarCliente(cli({ dataUltimaCompra: '2026-10-07' }), k, HOJE, cfg), null);
});

test('um motivo por cliente: vence a maior prioridade', () => {
  // Compra há 20 meses: receita vencida (prioridade 2) e cliente sumido (5) valem juntos.
  const s = avaliarCliente(cli({ dataUltimaCompra: '2025-02-14' }), [], HOJE, cfg);
  assert.equal(s.regra.id, 'receita_vencida');
});

test('"não respondeu": volta em 3 dias, no máximo 2 tentativas, depois passa ao próximo motivo', () => {
  const c = cli({ dataUltimaCompra: '2025-02-14' });
  const chave = 'receita_vencida:2026-02-14';
  const k1 = [contato({ dia: '2026-10-12', resultado: 'nao_respondeu', chaveCiclo: chave })];
  assert.equal(avaliarCliente(c, k1, HOJE, cfg), null);                       // 2 dias: pausa
  const s = avaliarCliente(c, k1, '2026-10-15', cfg);
  assert.equal(s.regra.id, 'receita_vencida');                               // 3 dias: volta
  assert.equal(s.tentativa, 2);
  const k2 = [...k1, contato({ dia: '2026-10-15', resultado: 'nao_respondeu', chaveCiclo: chave })];
  assert.equal(avaliarCliente(c, k2, '2026-10-18', cfg).regra.id, 'cliente_sumido'); // vencida encerrada
});

test('"respondeu" encerra o motivo e pausa o cliente por 15 dias', () => {
  const c = cli({ dataUltimaCompra: '2026-10-07' });
  const k = [contato({ dia: HOJE, resultado: 'respondeu', chaveCiclo: 'adaptacao:2026-10-14' })];
  assert.equal(avaliarCliente(c, k, HOJE, cfg), null);
  assert.equal(avaliarCliente(c, k, '2026-10-20', cfg), null);
});

test('nova compra abre novo ciclo do mesmo motivo', () => {
  const k = [contato({ dia: '2025-06-01', resultado: 'respondeu', chaveCiclo: 'adaptacao:2025-06-01' })];
  assert.equal(avaliarCliente(cli({ dataUltimaCompra: '2026-10-07' }), k, HOJE, cfg)?.regra.id, 'adaptacao');
});

test('aniversário: desligado por padrão; ligado, só no dia', () => {
  const c = cli({ dataNascimento: '1990-10-14' });
  assert.equal(avaliarCliente(c, [], HOJE, cfg), null);
  assert.equal(avaliarCliente(c, [], HOJE, comAniversario)?.regra.id, 'aniversario');
  assert.equal(avaliarCliente(c, [], '2026-10-15', comAniversario), null);
});

test('lista: ordena por prioridade e atraso, aplica limite descontando feitos hoje', () => {
  const clientes = [
    cli({ id: 'a', nome: 'Sumido', dataUltimaCompra: '2020-01-01', dataReceita: '2020-01-01' }),
    cli({ id: 'b', nome: 'Vencida antiga', dataUltimaCompra: '2024-01-01' }),
    cli({ id: 'c', nome: 'Vencida recente', dataUltimaCompra: '2025-09-01' }),
    cli({ id: 'd', nome: 'Adaptação', dataUltimaCompra: '2026-10-05' }),
    cli({ id: 'e', nome: 'Sem consentimento', consentimento: 'NAO', dataUltimaCompra: '2026-10-05' }),
  ];
  const r = montarListaDoDia({ clientes, contatos: [], hoje: HOJE, cfg, limiteDiario: 20 });
  assert.deepEqual(r.itens.map((i) => i.cliente.id), ['d', 'a', 'b', 'c']);
  assert.equal(r.totalPendentes, 4);

  const feitos = [contato({ clienteId: 'x', dia: HOJE, resultado: 'respondeu', chaveCiclo: 'k' })];
  const r2 = montarListaDoDia({ clientes, contatos: feitos, hoje: HOJE, cfg, limiteDiario: 3 });
  assert.equal(r2.feitosHoje, 1);
  assert.equal(r2.itens.length, 2);
});

test('mensagem e detalhe usam primeiro nome, loja e tempo relativo', () => {
  const c = cli({ nome: 'ana beatriz lima', dataUltimaCompra: '2026-10-06' });
  const s = avaliarCliente(c, [], HOJE, cfg);
  assert.match(montarMensagem(s.regra.mensagem, c, { nome: 'MM Óptica', endereco: 'Rua X, 1' }), /^Olá, Ana! Aqui é da MM Óptica\./);
  assert.equal(montarDetalhe(s, HOJE), 'Comprou há 8 dias');
});

test('mensagem do cliente sumido inclui o endereço da loja', () => {
  const c = cli({ dataUltimaCompra: '2020-01-01', dataReceita: '2020-01-01' });
  const sumido = cfg.regras.find((r) => r.id === 'cliente_sumido');
  assert.match(montarMensagem(sumido.mensagem, c, { nome: 'MM Óptica', endereco: 'Rua X, 1' }), /na Rua X, 1\.$/);
});
