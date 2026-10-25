/**
 * MM Óptica · CRM — Backend (Google Apps Script + Google Sheets)
 * ==============================================================
 * Cole este arquivo em Extensões > Apps Script da planilha.
 * Depois, na planilha: menu "CRM Ótica" > "1. Preparar planilha"
 * e "2. Cadastrar usuário" (uma vez para cada operador).
 *
 * Contrato da API (POST, corpo JSON enviado como text/plain):
 *   pedido:   { acao, token, dados }
 *   resposta: { ok: true, dados } | { ok: false, erro: { codigo, campos? } }
 */

/* ======================= CONFIGURAÇÃO ======================= */
var CONFIG = {
  FUSO: 'America/Fortaleza',
  SESSAO_HORAS: 12,
  MAX_FALHAS_LOGIN: 5,
  BLOQUEIO_MINUTOS: 15,  // depois de MAX_FALHAS_LOGIN senhas erradas
  ESPERA_TRAVA_MS: 15000,
  FASES: { leads: true }, // Fase 2 ligada: cria a aba Leads ao rodar "Preparar planilha"
};

/** Abas e colunas. Novas colunas podem ser acrescentadas NO FINAL e rodar "Preparar planilha" de novo. */
var ABAS = {
  Usuarios: ['usuario', 'nome', 'salt', 'senha_hash', 'ativo', 'criado_em'],
  Clientes: ['id', 'nome', 'whatsapp', 'data_nascimento', 'ultima_compra', 'proximo_contato', 'motivo_proximo',
             'consentimento', 'consentimento_em', 'observacao', 'origem_lead_id',
             'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por'],
  Contatos: ['id', 'cliente_id', 'data', 'resultado', 'motivo', 'observacao', 'proximo_contato', 'operador', 'criado_em', 'lead_id'],
  Compras:  ['id', 'cliente_id', 'data', 'descricao', 'valor', 'forma_pagamento', 'observacao', 'operador', 'criado_em'],
  Receitas: ['id', 'cliente_id', 'data', 'medico', 'od_esferico', 'od_cilindrico', 'od_eixo',
             'oe_esferico', 'oe_cilindrico', 'oe_eixo', 'adicao', 'dnp_od', 'dnp_oe', 'observacao', 'operador', 'criado_em'],
  Auditoria: ['data_hora', 'operador', 'acao', 'entidade', 'registro_id'],
};

/** Fase 2: aba de leads (criada só com CONFIG.FASES.leads = true). */
var ABAS_FASE2 = {
  Leads: ['id', 'nome', 'whatsapp', 'origem', 'interesse', 'status', 'proximo_contato', 'motivo_proximo',
          'consentimento', 'consentimento_em', 'observacao', 'cliente_id',
          'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por'],
};

var COLUNAS_SIM_NAO = ['consentimento', 'ativo'];
var STATUS_LEAD = ['novo', 'em_contato', 'agendado', 'convertido', 'perdido'];
var RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* ======================= ENTRADA HTTP ======================= */

function doGet() {
  return json_({ ok: true, dados: { status: 'online' } });
}

function doPost(e) {
  try {
    var pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var acao = ACOES[pedido.acao];
    if (!acao) throw erro_('DESCONHECIDO');
    var usuario = pedido.acao === 'login' ? null : validarToken_(pedido.token);
    return json_({ ok: true, dados: acao(pedido.dados || {}, usuario) });
  } catch (err) {
    if (err && err.codigo) return json_({ ok: false, erro: { codigo: err.codigo, campos: err.campos } });
    console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, erro: { codigo: 'DESCONHECIDO' } });
  }
}

/* ======================= AÇÕES ======================= */
var ACOES = {
  login: login_,

  carregar: function () {
    return {
      clientes: lerTodos_('Clientes'),
      contatos: lerTodos_('Contatos'),
      compras: lerTodos_('Compras'),
      receitas: lerTodos_('Receitas'),
      leads: CONFIG.FASES.leads ? lerTodos_('Leads') : [],
    };
  },

  salvarCliente: function (d, u) {
    return comTrava_(function () {
      var erros = {};
      var nome = texto_(d.nome, 120);
      var whatsapp = String(d.whatsapp || '').replace(/\D/g, '');
      if (nome.length < 2) erros.nome = 'Informe o nome do cliente.';
      if (whatsapp.length < 12 || whatsapp.length > 13) erros.whatsapp = 'Informe o WhatsApp com DDD.';
      ['ultima_compra', 'data_nascimento', 'proximo_contato', 'consentimento_em'].forEach(function (c) {
        if (d[c] && !RE_DATA.test(d[c])) erros[c] = 'Data inválida.';
      });
      exigirSemErros_(erros);

      var campos = {
        nome: nome, whatsapp: whatsapp,
        data_nascimento: d.data_nascimento || '', ultima_compra: d.ultima_compra || '',
        proximo_contato: d.proximo_contato || '', motivo_proximo: texto_(d.motivo_proximo, 120),
        consentimento: d.consentimento === true, consentimento_em: d.consentimento_em || '',
        observacao: texto_(d.observacao, 500),
        atualizado_em: agoraISO_(), atualizado_por: u.nome,
      };
      if (d.id) return atualizar_('Clientes', d.id, campos);
      campos.id = Utilities.getUuid();
      campos.criado_em = campos.atualizado_em;
      campos.criado_por = u.nome;
      return inserir_('Clientes', campos);
    });
  },

  /** LGPD: apaga o cliente e todo o histórico. Fica só um registro anônimo na Auditoria. */
  excluirCliente: function (d, u) {
    return comTrava_(function () {
      if (!excluirPorId_('Clientes', d.id)) throw erro_('NAO_ENCONTRADO');
      ['Contatos', 'Compras', 'Receitas'].forEach(function (aba) { excluirOnde_(aba, 'cliente_id', d.id); });
      auditar_(u, 'exclusao_lgpd', 'Clientes', d.id);
      return { id: d.id };
    });
  },

  /** Contato com cliente (cliente_id) ou lead (lead_id). Para lead, também atualiza o status do funil. */
  registrarContato: function (d, u) {
    return comTrava_(function () {
      var ehLead = Boolean(d.lead_id);
      var aba = ehLead ? 'Leads' : 'Clientes';
      var alvoId = ehLead ? d.lead_id : d.cliente_id;
      buscarPorId_(aba, alvoId); // garante que existe
      var erros = {};
      if (!d.resultado) erros.resultado = 'Escolha como foi o contato.';
      if (d.proximo_contato && !RE_DATA.test(d.proximo_contato)) erros.proximo_contato = 'Data inválida.';
      exigirSemErros_(erros);

      var contato = inserir_('Contatos', {
        id: Utilities.getUuid(), cliente_id: ehLead ? '' : d.cliente_id, lead_id: ehLead ? d.lead_id : '',
        data: hoje_(), resultado: texto_(d.resultado, 40), motivo: texto_(d.motivo, 120),
        observacao: texto_(d.observacao, 500), proximo_contato: d.proximo_contato || '',
        operador: u.nome, criado_em: agoraISO_(),
      });
      var campos = {
        proximo_contato: d.proximo_contato || '',
        motivo_proximo: d.proximo_contato ? texto_(d.motivo_proximo, 120) : '',
        atualizado_em: agoraISO_(), atualizado_por: u.nome,
      };
      if (ehLead && STATUS_LEAD.indexOf(d.status_lead) >= 0) campos.status = d.status_lead;
      var r = { contato: contato };
      r[ehLead ? 'lead' : 'cliente'] = atualizar_(aba, alvoId, campos);
      return r;
    });
  },

  /* ---------------- LEADS (Fase 2) ---------------- */
  salvarLead: function (d, u) {
    return comTrava_(function () {
      var erros = {};
      var nome = texto_(d.nome, 120);
      var whatsapp = String(d.whatsapp || '').replace(/\D/g, '');
      if (nome.length < 2) erros.nome = 'Informe o nome.';
      if (whatsapp.length < 12 || whatsapp.length > 13) erros.whatsapp = 'Informe o WhatsApp com DDD.';
      if (STATUS_LEAD.indexOf(d.status || 'novo') < 0) erros.status = 'Status inválido.';
      if (d.proximo_contato && !RE_DATA.test(d.proximo_contato)) erros.proximo_contato = 'Data inválida.';
      exigirSemErros_(erros);

      var campos = {
        nome: nome, whatsapp: whatsapp, origem: texto_(d.origem, 40), interesse: texto_(d.interesse, 40),
        status: d.status || 'novo', proximo_contato: d.proximo_contato || '', motivo_proximo: texto_(d.motivo_proximo, 120),
        consentimento: d.consentimento === true, consentimento_em: d.consentimento_em || '',
        observacao: texto_(d.observacao, 500), atualizado_em: agoraISO_(), atualizado_por: u.nome,
      };
      if (d.id) return atualizar_('Leads', d.id, campos);
      campos.id = Utilities.getUuid();
      campos.cliente_id = '';
      campos.criado_em = campos.atualizado_em;
      campos.criado_por = u.nome;
      return inserir_('Leads', campos);
    });
  },

  /** LGPD: apaga o lead e os contatos dele. */
  excluirLead: function (d, u) {
    return comTrava_(function () {
      if (!excluirPorId_('Leads', d.id)) throw erro_('NAO_ENCONTRADO');
      excluirOnde_('Contatos', 'lead_id', d.id);
      auditar_(u, 'exclusao_lgpd', 'Leads', d.id);
      return { id: d.id };
    });
  },

  /** Cria a ficha de cliente a partir do lead e marca o lead como "convertido". */
  converterLead: function (d, u) {
    return comTrava_(function () {
      var lead = buscarPorId_('Leads', d.id);
      if (lead.status === 'convertido' && lead.cliente_id) throw erro_('JA_CONVERTIDO');
      var agora = agoraISO_();
      var cliente = inserir_('Clientes', {
        id: Utilities.getUuid(), nome: lead.nome, whatsapp: lead.whatsapp,
        consentimento: lead.consentimento === true, consentimento_em: lead.consentimento_em,
        observacao: lead.observacao, origem_lead_id: lead.id,
        criado_em: agora, criado_por: u.nome, atualizado_em: agora, atualizado_por: u.nome,
      });
      var leadAtualizado = atualizar_('Leads', lead.id, {
        status: 'convertido', cliente_id: cliente.id, proximo_contato: '', motivo_proximo: '',
        atualizado_em: agora, atualizado_por: u.nome,
      });
      return { lead: leadAtualizado, cliente: cliente };
    });
  },

  salvarCompra: function (d, u) {
    return comTrava_(function () {
      buscarPorId_('Clientes', d.cliente_id);
      var erros = {};
      if (!RE_DATA.test(d.data || '')) erros.data = 'Data inválida.';
      if (!texto_(d.descricao, 200)) erros.descricao = 'Descreva o que foi comprado.';
      exigirSemErros_(erros);

      var compra = inserir_('Compras', {
        id: Utilities.getUuid(), cliente_id: d.cliente_id, data: d.data,
        descricao: texto_(d.descricao, 200), valor: texto_(d.valor, 20),
        forma_pagamento: texto_(d.forma_pagamento, 40), observacao: texto_(d.observacao, 500),
        operador: u.nome, criado_em: agoraISO_(),
      });
      return { compra: compra, cliente: recalcularUltimaCompra_(d.cliente_id, u) };
    });
  },

  salvarReceita: function (d, u) {
    return comTrava_(function () {
      buscarPorId_('Clientes', d.cliente_id);
      if (!RE_DATA.test(d.data || '')) exigirSemErros_({ data: 'Data inválida.' });
      var r = { id: Utilities.getUuid(), cliente_id: d.cliente_id, data: d.data, operador: u.nome, criado_em: agoraISO_() };
      ['medico', 'od_esferico', 'od_cilindrico', 'od_eixo', 'oe_esferico', 'oe_cilindrico', 'oe_eixo',
       'adicao', 'dnp_od', 'dnp_oe', 'observacao'].forEach(function (c) { r[c] = texto_(d[c], c === 'observacao' ? 500 : 100); });
      return { receita: inserir_('Receitas', r) };
    });
  },

  /** Corrige lançamentos feitos por engano (compras ou receitas). */
  excluirRegistro: function (d, u) {
    var abas = { compras: 'Compras', receitas: 'Receitas' };
    var aba = abas[d.tipo];
    if (!aba) throw erro_('DADOS_INVALIDOS');
    return comTrava_(function () {
      var reg = buscarPorId_(aba, d.id);
      excluirPorId_(aba, d.id);
      auditar_(u, 'exclusao_registro', aba, d.id);
      var cliente = aba === 'Compras' ? recalcularUltimaCompra_(reg.cliente_id, u) : null;
      return { cliente: cliente };
    });
  },

  // PONTO DE EXTENSÃO: ação `indicadores` se o cálculo do Painel precisar ir para o servidor
};

/** Última compra = data mais recente entre as compras (se houver alguma). */
function recalcularUltimaCompra_(clienteId, u) {
  var datas = lerTodos_('Compras')
    .filter(function (c) { return c.cliente_id === clienteId && RE_DATA.test(c.data); })
    .map(function (c) { return c.data; })
    .sort();
  if (!datas.length) return buscarPorId_('Clientes', clienteId);
  return atualizar_('Clientes', clienteId, {
    ultima_compra: datas[datas.length - 1], atualizado_em: agoraISO_(), atualizado_por: u.nome,
  });
}

/* ======================= AUTENTICAÇÃO ======================= */

function login_(d) {
  var usuario = String(d.usuario || '').trim().toLowerCase();
  var cache = CacheService.getScriptCache();
  var chaveFalhas = 'falhas_' + usuario;
  var falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= CONFIG.MAX_FALHAS_LOGIN) throw erro_('LOGIN_BLOQUEADO');

  var reg = lerTodos_('Usuarios').filter(function (x) {
    return String(x.usuario).toLowerCase() === usuario && x.ativo === true;
  })[0];

  if (!reg || hashSenha_(reg.salt, String(d.senha || '')) !== reg.senha_hash) {
    cache.put(chaveFalhas, String(falhas + 1), CONFIG.BLOQUEIO_MINUTOS * 60);
    Utilities.sleep(600); // atrasa tentativas automáticas
    throw erro_('LOGIN_INVALIDO');
  }
  cache.remove(chaveFalhas);

  var expiraEm = Date.now() + CONFIG.SESSAO_HORAS * 3600 * 1000;
  var carga = reg.usuario + '|' + expiraEm;
  return { token: b64_(carga) + '.' + assinar_(carga), nome: reg.nome || reg.usuario, expiraEm: expiraEm };
}

/** Confere assinatura e validade do token; retorna { usuario, nome }. */
function validarToken_(token) {
  var partes = String(token || '').split('.');
  if (partes.length !== 2) throw erro_('SESSAO_EXPIRADA');
  var carga;
  try { carga = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString(); }
  catch (e) { throw erro_('SESSAO_EXPIRADA'); }
  if (!igualSeguro_(assinar_(carga), partes[1])) throw erro_('SESSAO_EXPIRADA');
  var p = carga.split('|');
  if (Date.now() > Number(p[1])) throw erro_('SESSAO_EXPIRADA');

  // Confere se o usuário continua ativo (com cache de 10 min para não ler a aba a cada pedido).
  var cache = CacheService.getScriptCache();
  var chave = 'usuario_' + p[0].toLowerCase();
  var nome = cache.get(chave);
  if (!nome) {
    var reg = lerTodos_('Usuarios').filter(function (x) { return x.usuario === p[0] && x.ativo === true; })[0];
    if (!reg) throw erro_('SESSAO_EXPIRADA');
    nome = reg.nome || reg.usuario;
    cache.put(chave, nome, 600);
  }
  return { usuario: p[0], nome: nome };
}

function segredo_() {
  var s = PropertiesService.getScriptProperties().getProperty('SEGREDO');
  if (!s) throw new Error('Rode "Preparar planilha" antes de usar o sistema.');
  return s;
}

/** HMAC-SHA256 com o segredo do script + salt por usuário. A senha nunca é guardada. */
function hashSenha_(salt, senha) {
  return hex_(Utilities.computeHmacSha256Signature(salt + ':' + senha, segredo_(), Utilities.Charset.UTF_8));
}
function assinar_(texto) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, segredo_(), Utilities.Charset.UTF_8)).replace(/=+$/, '');
}
function b64_(texto) {
  return Utilities.base64EncodeWebSafe(texto, Utilities.Charset.UTF_8);
}
function hex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function igualSeguro_(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ======================= ACESSO À PLANILHA ======================= */

function aba_(nome) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!sh) throw new Error('Aba "' + nome + '" não existe. Rode "Preparar planilha".');
  return sh;
}

function lerTodos_(nome) {
  var valores = aba_(nome).getDataRange().getValues();
  var cab = valores.shift() || [];
  return valores
    .filter(function (l) { return l[0] !== '' && l[0] !== null; })
    .map(function (l) { return paraObjeto_(cab, l); });
}

function paraObjeto_(cab, linha) {
  var o = {};
  cab.forEach(function (c, i) {
    var v = linha[i];
    if (v instanceof Date) v = Utilities.formatDate(v, CONFIG.FUSO, 'yyyy-MM-dd');
    if (COLUNAS_SIM_NAO.indexOf(c) >= 0) v = String(v).toUpperCase() === 'SIM' || v === true;
    else v = v === null || v === undefined ? '' : String(v);
    o[c] = v;
  });
  return o;
}

/** Prepara um valor para gravar: SIM/NÃO, texto e proteção contra fórmulas. */
function paraCelula_(coluna, v) {
  if (COLUNAS_SIM_NAO.indexOf(coluna) >= 0) return v === true ? 'SIM' : 'NÃO';
  if (v === null || v === undefined) return '';
  var s = String(v);
  // Apóstrofo força texto: impede fórmulas (=, +, -, @, tab, quebra) e mantém graus como "-2,25".
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function linhaDoId_(nome, id) {
  if (!id) return 0;
  var achou = aba_(nome).getRange('A:A').createTextFinder(String(id)).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}

function buscarPorId_(nome, id) {
  var linha = linhaDoId_(nome, id);
  if (!linha) throw erro_('NAO_ENCONTRADO');
  var sh = aba_(nome);
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return paraObjeto_(cab, sh.getRange(linha, 1, 1, cab.length).getValues()[0]);
}

function inserir_(nome, obj) {
  var sh = aba_(nome);
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(cab.map(function (c) { return paraCelula_(c, obj[c]); }));
  return buscarPorId_(nome, obj.id);
}

function atualizar_(nome, id, campos) {
  var linha = linhaDoId_(nome, id);
  if (!linha) throw erro_('NAO_ENCONTRADO');
  var sh = aba_(nome);
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var atual = paraObjeto_(cab, sh.getRange(linha, 1, 1, cab.length).getValues()[0]);
  var novo = cab.map(function (c) { return paraCelula_(c, c in campos ? campos[c] : atual[c]); });
  sh.getRange(linha, 1, 1, cab.length).setValues([novo]);
  return buscarPorId_(nome, id);
}

function excluirPorId_(nome, id) {
  var linha = linhaDoId_(nome, id);
  if (!linha) return false;
  aba_(nome).deleteRow(linha);
  return true;
}

/** Apaga todas as linhas em que `coluna` = valor (de baixo para cima). */
function excluirOnde_(nome, coluna, valor) {
  var sh = aba_(nome);
  var dados = sh.getDataRange().getValues();
  var idx = dados[0].indexOf(coluna);
  for (var i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][idx]) === String(valor)) sh.deleteRow(i + 1);
  }
}

function auditar_(u, acao, entidade, id) {
  aba_('Auditoria').appendRow([agoraISO_(), u.nome, acao, entidade, id]);
}

/** Evita que dois operadores gravem ao mesmo tempo na mesma linha. */
function comTrava_(fn) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(CONFIG.ESPERA_TRAVA_MS)) throw erro_('OCUPADO');
  try { return fn(); } finally { trava.releaseLock(); }
}

/* ======================= UTILITÁRIOS ======================= */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function erro_(codigo, campos) { return { codigo: codigo, campos: campos }; }
function exigirSemErros_(erros) { if (Object.keys(erros).length) throw erro_('DADOS_INVALIDOS', erros); }
function texto_(v, max) { return String(v === null || v === undefined ? '' : v).trim().slice(0, max || 200); }
function hoje_() { return Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyyy-MM-dd'); }
function agoraISO_() { return Utilities.formatDate(new Date(), CONFIG.FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }

/* ======================= MENU DE CONFIGURAÇÃO ======================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('CRM Ótica')
    .addItem('1. Preparar planilha', 'prepararPlanilha')
    .addItem('2. Cadastrar usuário ou trocar senha', 'cadastrarUsuario')
    .addItem('Desativar usuário', 'desativarUsuario')
    .addToUi();
}

/** Cria/atualiza as abas, formata colunas como texto e gera o segredo. Pode rodar quantas vezes quiser. */
function prepararPlanilha() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(CONFIG.FUSO);
  var todas = Object.assign({}, ABAS, CONFIG.FASES.leads ? ABAS_FASE2 : {});
  Object.keys(todas).forEach(function (nome) {
    var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    var cab = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String) : [];
    var faltam = todas[nome].filter(function (c) { return cab.indexOf(c) < 0; });
    if (faltam.length) sh.getRange(1, cab.length + 1, 1, faltam.length).setValues([faltam]);
    var total = cab.length + faltam.length;
    sh.getRange(1, 1, sh.getMaxRows(), total).setNumberFormat('@'); // tudo como texto: datas e telefones não mudam
    sh.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#EFE7F7');
    sh.setFrozenRows(1);
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SEGREDO')) props.setProperty('SEGREDO', Utilities.getUuid() + Utilities.getUuid());
  SpreadsheetApp.getUi().alert('Planilha pronta. Agora cadastre os usuários pelo menu "CRM Ótica".');
}

function cadastrarUsuario() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Cadastrar usuário', 'Usuário (para entrar no sistema):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var usuario = r1.getResponseText().trim();
  var r2 = ui.prompt('Cadastrar usuário', 'Nome que aparece no sistema (ex.: Maria):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var r3 = ui.prompt('Cadastrar usuário', 'Senha (mínimo 8 caracteres, misture letras e números):', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  var senha = r3.getResponseText();
  if (!usuario || senha.length < 8) { ui.alert('Usuário vazio ou senha com menos de 8 caracteres. Nada foi salvo.'); return; }

  var salt = Utilities.getUuid();
  var dados = { usuario: usuario, nome: r2.getResponseText().trim() || usuario, salt: salt,
                senha_hash: hashSenha_(salt, senha), ativo: true, criado_em: agoraISO_() };
  var sh = aba_('Usuarios');
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var linha = linhaDoId_('Usuarios', usuario);
  var valores = cab.map(function (c) { return paraCelula_(c, dados[c]); });
  if (linha) sh.getRange(linha, 1, 1, cab.length).setValues([valores]);
  else sh.appendRow(valores);
  CacheService.getScriptCache().remove('usuario_' + usuario.toLowerCase());
  ui.alert(linha ? 'Senha atualizada.' : 'Usuário cadastrado.');
}

function desativarUsuario() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Desativar usuário', 'Usuário a desativar:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var usuario = r.getResponseText().trim();
  var linha = linhaDoId_('Usuarios', usuario);
  if (!linha) { ui.alert('Usuário não encontrado.'); return; }
  var sh = aba_('Usuarios');
  var col = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf('ativo') + 1;
  sh.getRange(linha, col).setValue('NÃO');
  CacheService.getScriptCache().remove('usuario_' + usuario.toLowerCase());
  ui.alert('Usuário desativado. A sessão dele termina em até 10 minutos.');
}
