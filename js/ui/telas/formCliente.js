/**
 * Cadastro e edição de cliente. Formulário curto: o essencial à vista,
 * o resto em "Mais informações" (fica fechado em telas pequenas).
 */
import { APP_CONFIG } from '../../config/app.config.js';
import { TEXTOS } from '../../config/textos.js';
import { el, icone, limpar } from '../../core/dom.js';
import { mensagemParaOperador, registrarErro } from '../../core/erros.js';
import { navegar } from '../../core/router.js';
import { store } from '../../core/store.js';
import { dataService } from '../../data/dataService.js';
import { encontrarDuplicado, validarCliente } from '../../services/clientes.js';
import { hojeISO } from '../../services/datas.js';
import { formatarWhatsApp, normalizarWhatsApp } from '../../services/telefone.js';
import { avisar } from '../componentes/aviso.js';
import { confirmar } from '../componentes/dialogo.js';
import { estadoCarregando, estadoErro } from '../layout.js';

export async function telaFormCliente(principal, { id } = {}) {
  limpar(principal);
  if (id && !store.jaCarregou) {
    principal.append(estadoCarregando());
    try { await store.carregar(); } catch (erro) {
      registrarErro(erro, 'carregar para editar');
      limpar(principal).append(estadoErro(mensagemParaOperador(erro, 'carregar'), () => telaFormCliente(principal, { id })));
      return;
    }
    limpar(principal);
  }

  const atual = id ? store.clientePorId(id) : null;
  if (id && !atual) { navegar('#/clientes'); return; }

  const hoje = hojeISO(APP_CONFIG.fusoHorario);
  const v = atual || {};
  const campos = {};

  /* ---------- montagem dos campos ---------- */

  const campo = (nome, rotulo, input, dica) => {
    input.id = `f-${nome}`;
    input.name = nome;
    const erro = el('p', { class: 'erro-campo', id: `e-${nome}` });
    const ajuda = dica ? el('p', { class: 'dica', id: `d-${nome}` }, dica) : null;
    input.setAttribute('aria-describedby', [dica ? `d-${nome}` : '', `e-${nome}`].join(' ').trim());
    campos[nome] = { input, erro };
    return el('div', { class: 'campo' }, el('label', { for: input.id }, rotulo), input, ajuda, erro);
  };

  const data = (nome) => el('input', { type: 'date', max: hoje, value: v[nome] || '' });

  const radioConsent = (valor, texto) => el('label', { class: 'opcao' },
    el('input', { type: 'radio', name: 'consentimento', value: valor, checked: v.consentimento === valor }),
    el('span', {}, texto));
  const erroConsent = el('p', { class: 'erro-campo', id: 'e-consentimento' });
  campos.consentimento = { input: null, erro: erroConsent };

  const naoQuer = el('input', { type: 'checkbox', id: 'f-naoQuerContato', checked: v.naoQuerContato === 'SIM' });

  const whatsapp = el('input', {
    type: 'tel', inputmode: 'tel', autocomplete: 'off', placeholder: '(85) 99999-8888',
    value: v.whatsapp ? formatarWhatsApp(v.whatsapp) : '',
  });
  // Ao sair do campo, mostra o número já arrumado (ou o problema).
  whatsapp.addEventListener('blur', () => {
    if (!whatsapp.value.trim()) return;
    const r = normalizarWhatsApp(whatsapp.value);
    if (r.ok) {
      whatsapp.value = formatarWhatsApp(r.numero);
      mostrarErro('whatsapp', '');
      campos.whatsapp.erro.textContent = r.aviso || '';
      campos.whatsapp.erro.classList.toggle('e-aviso', Boolean(r.aviso));
    } else {
      mostrarErro('whatsapp', r.erro);
    }
  });

  const botaoSalvar = el('button', { type: 'submit', class: 'btn btn-primario btn-largo' }, 'Salvar cliente');
  const erroGeral = el('p', { class: 'erro-form', role: 'alert' });

  const form = el('form', { class: 'form', novalidate: true },
    campo('nome', 'Nome', el('input', { autocomplete: 'off', autocapitalize: 'words', maxlength: 120, value: v.nome || '' })),
    campo('whatsapp', 'WhatsApp com DDD', whatsapp),
    campo('dataUltimaCompra', 'Data da última compra', data('dataUltimaCompra')),
    campo('dataReceita', 'Data da receita', data('dataReceita'),
      'Se não souber, deixe em branco: usamos a data da compra.'),
    el('fieldset', { class: 'campo', 'aria-describedby': 'e-consentimento' },
      el('legend', {}, 'O cliente autorizou receber mensagens no WhatsApp?'),
      el('div', { class: 'opcoes' }, radioConsent('SIM', 'Sim, autorizou'), radioConsent('NAO', 'Não autorizou')),
      erroConsent),
    el('details', { class: 'mais', open: Boolean(v.dataNascimento || v.observacao || v.naoQuerContato === 'SIM') || null },
      el('summary', {}, 'Mais informações'),
      campo('dataNascimento', 'Data de nascimento', data('dataNascimento')),
      campo('observacao', 'Observação', el('textarea', { rows: 3, maxlength: 1000 }, v.observacao || '')),
      el('label', { class: 'opcao opcao-alerta', for: 'f-naoQuerContato' },
        naoQuer,
        el('span', {}, 'Não quer receber contato',
          el('small', {}, 'O cliente sai da lista do dia e não recebe mais mensagens.'))),
    ),
    erroGeral,
    el('div', { class: 'acoes-form' },
      botaoSalvar,
      el('a', { href: atual ? `#/cliente/${encodeURIComponent(atual.id)}` : '#/hoje', class: 'btn btn-texto' }, 'Cancelar')),
  );

  function mostrarErro(nome, texto) {
    const c = campos[nome];
    if (!c) return;
    c.erro.textContent = texto;
    c.erro.classList.remove('e-aviso');
    c.input?.setAttribute('aria-invalid', texto ? 'true' : 'false');
  }

  /* ---------- envio ---------- */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroGeral.textContent = '';
    Object.keys(campos).forEach((n) => mostrarErro(n, ''));

    const dados = {
      id: atual?.id,
      versao: atual?.versao,
      nome: campos.nome.input.value,
      whatsapp: whatsapp.value,
      dataUltimaCompra: campos.dataUltimaCompra.input.value,
      dataReceita: campos.dataReceita.input.value,
      dataNascimento: campos.dataNascimento.input.value,
      observacao: campos.observacao.input.value,
      consentimento: form.querySelector('input[name="consentimento"]:checked')?.value || '',
      naoQuerContato: naoQuer.checked ? 'SIM' : 'NAO',
    };

    const { ok, erros, cliente } = validarCliente(dados, hoje);
    if (!ok) {
      for (const [nome, msg] of Object.entries(erros)) mostrarErro(nome, msg);
      const primeiro = Object.keys(erros)[0];
      if (['dataNascimento', 'observacao'].includes(primeiro)) form.querySelector('details').open = true;
      (campos[primeiro]?.input || form.querySelector('input[name="consentimento"]'))?.focus();
      return;
    }

    const duplicado = encontrarDuplicado(store.clientes, cliente.whatsapp, cliente.id);
    if (duplicado) {
      const seguir = await confirmar({
        titulo: 'WhatsApp já cadastrado',
        texto: TEXTOS.cliente.duplicado(duplicado.nome),
        confirmar: 'Salvar mesmo assim',
        cancelar: 'Voltar e conferir',
      });
      if (!seguir) return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando…';
    try {
      const salvo = await dataService.salvarCliente(cliente);
      store.salvarClienteLocal(salvo);
      avisar(TEXTOS.cliente.salvo);
      navegar(`#/cliente/${encodeURIComponent(salvo.id)}`);
    } catch (erro) {
      registrarErro(erro, 'salvar cliente');
      erroGeral.textContent = mensagemParaOperador(erro, 'salvar');
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = 'Salvar cliente';
    }
  });

  principal.append(
    atual ? el('a', { href: `#/cliente/${encodeURIComponent(atual.id)}`, class: 'voltar' }, icone('voltar'), atual.nome) : null,
    el('header', { class: 'tela-cab' }, el('h1', { class: 'tela-titulo' }, atual ? 'Editar cliente' : 'Cadastrar cliente')),
    form,
  );
  if (!atual) campos.nome.input.focus();
}
