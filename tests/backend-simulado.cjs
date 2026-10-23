// Testa o Code.gs com uma planilha simulada em memória. Rodar: node tests/backend-simulado.cjs
// Simula o mínimo do Google Apps Script para testar o Code.gs em memória.
const crypto = require('crypto'); const fs = require('fs'); const vm = require('vm');
class Range { constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.d[this.r - 1 + i] || [])[this.c - 1 + j]; l.push(v === undefined ? '' : v); } o.push(l); } return o; }
  setValues(v) { v.forEach((l, i) => l.forEach((x, j) => { const ri = this.r - 1 + i; this.sh.d[ri] = this.sh.d[ri] || []; this.sh.d[ri][this.c - 1 + j] = typeof x === 'string' && x.startsWith("'") ? x.slice(1) : x; })); return this; }
  setValue(x) { return this.setValues([[x]]); }
  setNumberFormat() { return this; } setFontWeight() { return this; } setBackground() { return this; }
  getRow() { return this.r; }
  createTextFinder(t) { const sh = this.sh; return { matchEntireCell() { return this; }, findNext() { const i = sh.d.findIndex((l) => String(l[0]).toLowerCase() === String(t).toLowerCase()); return i >= 0 ? new Range(sh, i + 1, 1, 1, 1) : null; } }; } }
class Sheet { constructor(n) { this.n = n; this.d = []; }
  getLastColumn() { return Math.max(0, ...this.d.map((l) => l.length)); } getLastRow() { return this.d.length; } getMaxRows() { return 1000; }
  getRange(a, b, c, d) { if (typeof a === 'string') return new Range(this, 1, 1, Math.max(1, this.d.length), 1); return new Range(this, a, b, c || 1, d || 1); }
  getDataRange() { return new Range(this, 1, 1, this.d.length, this.getLastColumn()); }
  appendRow(l) { this.d.push(l.map((x) => (typeof x === 'string' && x.startsWith("'") ? x.slice(1) : x))); }
  deleteRow(r) { this.d.splice(r - 1, 1); } setFrozenRows() {} }
const sheets = {}; const props = {}; const cache = {};
const ctx = {
  console, Object, JSON, Date, Math, String, Number, Boolean, Array, Error,
  SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = new Sheet(n)), setSpreadsheetTimeZone() {} }),
    getUi: () => ({ alert() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ t, setMimeType() { return this; } }) },
  Utilities: {
    Charset: { UTF_8: 'utf8' }, getUuid: () => crypto.randomUUID(), sleep() {},
    formatDate: (d, tz, f) => (f === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 19)),
    computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()].map((b) => (b > 127 ? b - 256 : b)),
    base64EncodeWebSafe: (v) => Buffer.from(Array.isArray(v) ? v.map((b) => b & 255) : Buffer.from(v)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: (s) => [...Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')],
    newBlob: (b) => ({ getDataAsString: () => Buffer.from(b.map((x) => x & 255)).toString('utf8') }),
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2] || require("path").join(__dirname, "../apps-script/Code.gs"), "utf8") + '\n;this.__ = { prepararPlanilha, hashSenha_, doPost, aba_, paraCelula_ };', ctx);
const G = ctx.__;
G.prepararPlanilha();
// cadastra usuário direto (o menu usa prompts da planilha)
const salt = 'abc'; sheets.Usuarios.appendRow(['maria', 'Maria', salt, G.hashSenha_(salt, 'senhaforte1'), 'SIM', '']);
const call = (acao, dados, token) => JSON.parse(G.doPost({ postData: { contents: JSON.stringify({ acao, dados, token }) } }).t);
const ok = (r, msg) => { if (!r.ok) { console.log('FALHOU', msg, JSON.stringify(r)); process.exitCode = 1; } else console.log('ok -', msg); return r.dados; };
const falha = (r, cod, msg) => { console.log(r.ok || r.erro.codigo !== cod ? `FALHOU ${msg} ${JSON.stringify(r)}` : `ok - ${msg}`); };

falha(call('login', { usuario: 'maria', senha: 'errada' }), 'LOGIN_INVALIDO', 'senha errada recusada');
const s = ok(call('login', { usuario: 'Maria', senha: 'senhaforte1' }), 'login');
const T = s.token;
falha(call('carregar', {}, 'x.y'), 'SESSAO_EXPIRADA', 'token falso recusado');
const cli = ok(call('salvarCliente', { nome: 'Ana', whatsapp: '5585999990001', consentimento: true, ultima_compra: '2026-10-01' }, T), 'salvar cliente');
console.log('   consentimento lido como', cli.consentimento, '| aba grava', sheets.Clientes.d[1][7]);
falha(call('salvarCliente', { nome: 'A', whatsapp: '1' }, T), 'DADOS_INVALIDOS', 'validação no servidor');
const comp = ok(call('salvarCompra', { cliente_id: cli.id, data: '2026-10-20', descricao: 'Armação', valor: '450,00' }, T), 'compra');
console.log('   ultima_compra recalculada:', comp.cliente.ultima_compra);
const lead = ok(call('salvarLead', { nome: 'Bruna', whatsapp: '5585981110011', consentimento: true, status: 'novo', observacao: '-teste' }, T), 'salvar lead');
console.log('   observação com "-" preservada:', lead.observacao);
const rc = ok(call('registrarContato', { lead_id: lead.id, resultado: 'vai_passar', status_lead: 'agendado' }, T), 'contato com lead');
console.log('   status do lead:', rc.lead.status, '| contato.lead_id ok:', rc.contato.lead_id === lead.id);
const conv = ok(call('converterLead', { id: lead.id }, T), 'converter lead');
console.log('   lead:', conv.lead.status, '| cliente.origem_lead_id ok:', conv.cliente.origem_lead_id === lead.id);
falha(call('converterLead', { id: lead.id }, T), 'JA_CONVERTIDO', 'não converte duas vezes');
const tudo = ok(call('carregar', {}, T), 'carregar');
console.log('   clientes', tudo.clientes.length, 'leads', tudo.leads.length, 'contatos', tudo.contatos.length);
ok(call('excluirLead', { id: lead.id }, T), 'excluir lead (LGPD)');
console.log('   contatos do lead apagados:', sheets.Contatos.d.length - 1 === 0, '| auditoria:', sheets.Auditoria.d.length - 1);
ok(call('excluirCliente', { id: cli.id }, T), 'excluir cliente (LGPD)');
console.log('   compras restantes:', sheets.Compras.d.length - 1);
