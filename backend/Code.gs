/**
 * MM Óptica · CRM — Backend Google Apps Script
 * ---------------------------------------------------------------
 * Planilha = banco de dados. Abas: Clientes, Contatos, Usuarios.
 * Publicação: Implantar > Nova implantação > App da Web
 *   Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
 * O acesso é protegido pelo LOGIN do próprio CRM (aba Usuarios):
 * sem token válido, nenhuma ação lê ou grava dados.
 */

const CRM = {
  VERSAO: '1.0.0',
  TZ: 'America/Fortaleza',
  ABAS: {
    Clientes: [
      'id', 'nome', 'whatsapp', 'dataUltimaCompra', 'dataReceita', 'dataNascimento', 'observacao',
      'consentimento', 'dataConsentimento', 'naoQuerContato', 'dataNaoQuerContato',
      'criadoEm', 'versao', 'atualizadoPor',
    ],
    Contatos: [
      'id', 'clienteId', 'dia', 'dataHora', 'motivoId', 'motivoNome', 'chaveCiclo',
      'resultado', 'observacao', 'operador',
    ],
    Usuarios: ['login', 'nome', 'email', 'salt', 'hash', 'ativo', 'criadoEm'],
    // PONTO DE EXTENSÃO — Fase 2:
    // Leads: ['id','nome','whatsapp','origem','interesse','status','consentimento','dataConsentimento',
    //         'clienteId','criadoEm','versao','atualizadoPor'],
    // PONTO DE EXTENSÃO — Fase 3:
    // Vendas: ['id','clienteId','data','valor','tipo','contatoOrigemId','operador','criadoEm'],
  },
  // Espelha a configuração do front (recontato.config.js): resultado que bloqueia o cliente.
  RESULTADOS_VALIDOS: ['respondeu', 'nao_respondeu', 'nao_quer'],
  RESULTADO_BLOQUEIA: 'nao_quer',
  SESSAO_SEGUNDOS: 6 * 60 * 60,   // máximo do CacheService
  MAX_FALHAS_LOGIN: 5,
  BLOQUEIO_SEGUNDOS: 15 * 60,
  ITERACOES_HASH: 300,
};

/* =================================================================
   ENTRADA HTTP
   ================================================================= */

function doGet() {
  return json_({ ok: true, servico: 'mm-otica-crm', versao: CRM.VERSAO });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, erro: { codigo: 'requisicao' } });
  }

  try {
    if (req.acao === 'login') return json_({ ok: true, dados: login_(req.dados || {}) });

    const sessao = validarSessao_(req.token);
    const d = req.dados || {};
    let dados;
    switch (req.acao) {
      case 'logout': dados = logout_(req.token); break;
      case 'carregar': dados = carregar_(); break;
      case 'salvarCliente': dados = salvarCliente_(d, sessao); break;
      case 'excluirCliente': dados = excluirCliente_(d.id, sessao); break;
      case 'registrarContato': dados = registrarContato_(d, sessao); break;
      // PONTO DE EXTENSÃO — Fase 2: 'salvarLead', 'converterLead'
      // PONTO DE EXTENSÃO — Fase 3: 'registrarVenda', 'indicadores'
      default: throw erro_('requisicao', 'Ação desconhecida.');
    }
    return json_({ ok: true, dados: dados });
  } catch (err) {
    if (err && err.codigo) {
      return json_({ ok: false, erro: { codigo: err.codigo, mensagem: err.mensagemAmigavel || '' } });
    }
    console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, erro: { codigo: 'servidor' } });
  }
}

/* =================================================================
   AUTENTICAÇÃO
   ================================================================= */

function login_(d) {
  const loginInformado = String(d.login || '').trim().toLowerCase();
  const senha = String(d.senha || '');
  if (!loginInformado || !senha) throw erro_('login_invalido');

  const cache = CacheService.getScriptCache();
  const chaveFalhas = 'falhas:' + loginInformado;
  const falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= CRM.MAX_FALHAS_LOGIN) throw erro_('bloqueado');

  const usuario = lerAba_('Usuarios').find(function (u) {
    return String(u.login).toLowerCase() === loginInformado;
  });
  const valido = usuario
    && String(usuario.ativo).toUpperCase() === 'SIM'
    && iguais_(hashSenha_(senha, usuario.salt), usuario.hash);

  if (!valido) {
    cache.put(chaveFalhas, String(falhas + 1), CRM.BLOQUEIO_SEGUNDOS);
    Utilities.sleep(400); // atrasa tentativas automáticas
    throw erro_('login_invalido');
  }

  cache.remove(chaveFalhas);
  const token = Utilities.getUuid() + Utilities.getUuid();
  const sessao = { login: usuario.login, nome: usuario.nome };
  cache.put('sessao:' + token, JSON.stringify(sessao), CRM.SESSAO_SEGUNDOS);
  return { token: token, nome: usuario.nome, login: usuario.login };
}

function validarSessao_(token) {
  if (!token) throw erro_('sessao');
  const cache = CacheService.getScriptCache();
  const bruto = cache.get('sessao:' + token);
  if (!bruto) throw erro_('sessao');
  cache.put('sessao:' + token, bruto, CRM.SESSAO_SEGUNDOS); // renova enquanto estiver em uso
  return JSON.parse(bruto);
}

function logout_(token) {
  CacheService.getScriptCache().remove('sessao:' + token);
  return {};
}

function hashSenha_(senha, salt) {
  let h = salt + ':' + senha;
  for (let i = 0; i < CRM.ITERACOES_HASH; i++) {
    h = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function iguais_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* =================================================================
   AÇÕES
   ================================================================= */

function carregar_() {
  return { clientes: lerAba_('Clientes'), contatos: lerAba_('Contatos') };
}

function salvarCliente_(d, sessao) {
  const c = validarCliente_(d);
  return comTrava_(function () {
    const aba = aba_('Clientes');
    const agora = new Date().toISOString();
    const hoje = hoje_();
    let linha = d.id ? acharLinha_(aba, d.id) : 0;
    let atual = null;

    if (d.id) {
      if (!linha) throw erro_('nao_encontrado');
      atual = lerLinha_(aba, 'Clientes', linha);
      // Edição simultânea: se alguém salvou depois que a ficha foi aberta, recusa.
      if (d.versao && String(atual.versao) !== String(d.versao)) throw erro_('conflito');
    }

    const registro = {
      id: d.id || Utilities.getUuid(),
      nome: c.nome,
      whatsapp: c.whatsapp,
      dataUltimaCompra: c.dataUltimaCompra,
      dataReceita: c.dataReceita,
      dataNascimento: c.dataNascimento,
      observacao: c.observacao,
      consentimento: c.consentimento,
      dataConsentimento: !atual || atual.consentimento !== c.consentimento ? hoje : atual.dataConsentimento,
      naoQuerContato: c.naoQuerContato,
      dataNaoQuerContato: c.naoQuerContato === 'SIM'
        ? (atual && atual.naoQuerContato === 'SIM' ? atual.dataNaoQuerContato : hoje)
        : '',
      criadoEm: atual ? atual.criadoEm : agora,
      versao: agora,
      atualizadoPor: sessao.nome,
    };

    if (linha) escreverLinha_(aba, 'Clientes', linha, registro);
    else anexar_(aba, 'Clientes', registro);
    return registro;
  });
}

function excluirCliente_(id, sessao) {
  if (!id) throw erro_('validacao', 'Cliente não informado.');
  return comTrava_(function () {
    const abaC = aba_('Clientes');
    const linha = acharLinha_(abaC, id);
    if (!linha) throw erro_('nao_encontrado');
    abaC.deleteRow(linha);

    // LGPD: apaga também todo o histórico de contatos do cliente.
    const abaK = aba_('Contatos');
    const valores = abaK.getDataRange().getValues();
    const col = CRM.ABAS.Contatos.indexOf('clienteId');
    const manter = valores.slice(1).filter(function (l) { return String(l[col]) !== String(id); });
    const removidos = valores.length - 1 - manter.length;
    if (removidos > 0) {
      abaK.getRange(2, 1, Math.max(valores.length - 1, 1), CRM.ABAS.Contatos.length).clearContent();
      if (manter.length) {
        abaK.getRange(2, 1, manter.length, CRM.ABAS.Contatos.length).setNumberFormat('@').setValues(manter);
      }
    }
    console.log('Cliente ' + id + ' excluído por ' + sessao.nome);
    return { contatosRemovidos: removidos };
  });
}

function registrarContato_(d, sessao) {
  if (CRM.RESULTADOS_VALIDOS.indexOf(d.resultado) < 0) throw erro_('validacao', 'Resultado inválido.');
  if (!d.clienteId) throw erro_('validacao', 'Cliente não informado.');
  const dia = isoValido_(d.dia) ? d.dia : hoje_();

  return comTrava_(function () {
    const abaC = aba_('Clientes');
    const linha = acharLinha_(abaC, d.clienteId);
    if (!linha) throw erro_('nao_encontrado');

    const contato = {
      id: Utilities.getUuid(),
      clienteId: d.clienteId,
      dia: dia,
      dataHora: new Date().toISOString(),
      motivoId: texto_(d.motivoId, 60),
      motivoNome: texto_(d.motivoNome, 80),
      chaveCiclo: texto_(d.chaveCiclo, 100),
      resultado: d.resultado,
      observacao: texto_(d.observacao, 500),
      operador: sessao.nome, // vem da sessão, não do navegador
    };
    anexar_(aba_('Contatos'), 'Contatos', contato);

    let cliente;
    if (d.resultado === CRM.RESULTADO_BLOQUEIA) {
      cliente = lerLinha_(abaC, 'Clientes', linha);
      cliente.naoQuerContato = 'SIM';
      cliente.dataNaoQuerContato = dia;
      cliente.versao = contato.dataHora;
      cliente.atualizadoPor = sessao.nome;
      escreverLinha_(abaC, 'Clientes', linha, cliente);
    }
    return { contato: contato, cliente: cliente };
  });
}

/* =================================================================
   VALIDAÇÃO (o servidor nunca confia só no navegador)
   ================================================================= */

function validarCliente_(d) {
  const nome = String(d.nome || '').replace(/\s+/g, ' ').trim();
  if (nome.length < 2 || nome.length > 120) throw erro_('validacao', 'Informe o nome do cliente.');

  const whatsapp = normalizarWhatsApp_(d.whatsapp);
  if (!whatsapp) throw erro_('validacao', 'WhatsApp inválido. Use DDD + número.');

  if (['SIM', 'NAO'].indexOf(d.consentimento) < 0) {
    throw erro_('validacao', 'Informe se o cliente autorizou receber mensagens.');
  }

  const datas = {};
  ['dataUltimaCompra', 'dataReceita', 'dataNascimento'].forEach(function (campo) {
    const v = d[campo] || '';
    if (v && !isoValido_(v)) throw erro_('validacao', 'Há uma data inválida no cadastro.');
    datas[campo] = v;
  });

  return {
    nome: nome,
    whatsapp: whatsapp,
    dataUltimaCompra: datas.dataUltimaCompra,
    dataReceita: datas.dataReceita,
    dataNascimento: datas.dataNascimento,
    observacao: texto_(d.observacao, 1000),
    consentimento: d.consentimento,
    naoQuerContato: d.naoQuerContato === 'SIM' ? 'SIM' : 'NAO',
  };
}

const DDDS_ = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];

/** Mesma regra de js/services/telefone.js. */
function normalizarWhatsApp_(entrada) {
  let d = String(entrada || '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55\d{10,11}$/.test(d)) return '';
  if (DDDS_.indexOf(Number(d.slice(2, 4))) < 0) return '';
  if (d.length === 13 && d.charAt(4) !== '9') return '';
  return d;
}

function isoValido_(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return false;
  const p = v.split('-').map(Number);
  const dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2];
}

function texto_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

/* =================================================================
   PLANILHA
   ================================================================= */

function aba_(nome) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não existe. Rode "Preparar planilha".');
  return aba;
}

function lerAba_(nome) {
  const aba = aba_(nome);
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  const colunas = CRM.ABAS[nome];
  const valores = aba.getRange(2, 1, ultima - 1, colunas.length).getValues();
  const chave = colunas[0];
  return valores
    .map(function (l) { return paraObjeto_(colunas, l); })
    .filter(function (o) { return o[chave] !== ''; });
}

function lerLinha_(aba, nome, linha) {
  const colunas = CRM.ABAS[nome];
  return paraObjeto_(colunas, aba.getRange(linha, 1, 1, colunas.length).getValues()[0]);
}

function escreverLinha_(aba, nome, linha, obj) {
  aba.getRange(linha, 1, 1, CRM.ABAS[nome].length)
    .setNumberFormat('@') // texto puro: o Sheets não converte datas nem telefones
    .setValues([paraLinha_(nome, obj)]);
}

function anexar_(aba, nome, obj) {
  escreverLinha_(aba, nome, aba.getLastRow() + 1, obj);
}

function paraObjeto_(colunas, linha) {
  const o = {};
  colunas.forEach(function (c, i) {
    let v = linha[i];
    // Se alguém digitar uma data direto na planilha, converte para AAAA-MM-DD.
    if (v instanceof Date) v = Utilities.formatDate(v, CRM.TZ, 'yyyy-MM-dd');
    v = v === null || v === undefined ? '' : String(v);
    o[c] = v.indexOf("'=") === 0 ? v.slice(1) : v;
  });
  return o;
}

function paraLinha_(nome, obj) {
  return CRM.ABAS[nome].map(function (c) {
    const v = obj[c] == null ? '' : String(obj[c]);
    // Impede que um texto vire fórmula na planilha.
    return v.charAt(0) === '=' ? "'" + v : v;
  });
}

/** Linha (1-based) do registro com este id na coluna A, ou 0. */
function acharLinha_(aba, id) {
  const achou = aba.getRange('A:A').createTextFinder(String(id)).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}

/** Evita que duas gravações simultâneas se atropelem. */
function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(10000)) throw erro_('ocupado');
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

function hoje_() {
  return Utilities.formatDate(new Date(), CRM.TZ, 'yyyy-MM-dd');
}

function erro_(codigo, mensagem) {
  const e = new Error(mensagem || codigo);
  e.codigo = codigo;
  e.mensagemAmigavel = mensagem || '';
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =================================================================
   MENU NA PLANILHA (para o administrador)
   ================================================================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CRM')
    .addItem('1. Preparar planilha', 'prepararPlanilha')
    .addItem('2. Criar usuário ou trocar senha', 'criarOuTrocarSenha')
    .addToUi();
}

/** Cria as abas com cabeçalho, formato texto e proteção. Pode rodar mais de uma vez. */
function prepararPlanilha() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CRM.ABAS).forEach(function (nome) {
    let aba = planilha.getSheetByName(nome);
    if (!aba) aba = planilha.insertSheet(nome);
    const colunas = CRM.ABAS[nome];
    aba.getRange(1, 1, 1, colunas.length).setValues([colunas]).setFontWeight('bold');
    aba.setFrozenRows(1);
    // Tudo como texto: evita datas e telefones "convertidos" pelo Sheets.
    aba.getRange(1, 1, aba.getMaxRows(), colunas.length).setNumberFormat('@');
  });
  const usuarios = planilha.getSheetByName('Usuarios');
  usuarios.hideSheet();
  SpreadsheetApp.getUi().alert('Planilha pronta. Agora crie os usuários pelo menu CRM.');
}

function criarOuTrocarSenha() {
  const ui = SpreadsheetApp.getUi();
  const pedir = function (texto) {
    const r = ui.prompt(texto, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) throw new Error('cancelado');
    return r.getResponseText().trim();
  };
  try {
    const login = pedir('Usuário (ex.: maria):').toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(login)) { ui.alert('Use de 3 a 30 letras minúsculas, sem espaço.'); return; }
    const nome = pedir('Nome que aparece no histórico (ex.: Maria Marinho):');
    const senha = pedir('Senha (mínimo 8 caracteres). Anote em local seguro:');
    if (senha.length < 8) { ui.alert('A senha precisa ter pelo menos 8 caracteres.'); return; }

    const salt = Utilities.getUuid();
    const registro = {
      login: login, nome: nome, email: '', salt: salt, hash: hashSenha_(senha, salt),
      ativo: 'SIM', criadoEm: new Date().toISOString(),
    };
    comTrava_(function () {
      const aba = aba_('Usuarios');
      const linha = acharLinha_(aba, login);
      if (linha) escreverLinha_(aba, 'Usuarios', linha, registro);
      else anexar_(aba, 'Usuarios', registro);
    });
    ui.alert('Usuário "' + login + '" salvo. Para bloquear o acesso depois, troque "ativo" para NAO na aba Usuarios.');
  } catch (e) {
    if (String(e.message) !== 'cancelado') throw e;
  }
}
