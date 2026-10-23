/**
 * Tela principal: "Quem contatar hoje".
 * Ação principal: abrir o WhatsApp com a mensagem pronta. Depois, "Contatei".
 */
import { APP_CONFIG } from '../../config/app.config.js';
import { RECONTATO_CONFIG } from '../../config/recontato.config.js';
import { TEXTOS } from '../../config/textos.js';
import { el, icone, limpar } from '../../core/dom.js';
import { mensagemParaOperador, registrarErro } from '../../core/erros.js';
import { store } from '../../core/store.js';
import { dataService } from '../../data/dataService.js';
import { formatarDataLonga, hojeISO } from '../../services/datas.js';
import { montarDetalhe, montarListaDoDia, montarMensagem } from '../../services/recontato.js';
import { linkWhatsApp } from '../../services/telefone.js';
import { primeiroNome } from '../../services/texto.js';
import { avisar } from '../componentes/aviso.js';
import { abrirDialogo } from '../componentes/dialogo.js';
import { estadoCarregando, estadoErro } from '../layout.js';

export async function telaHoje(principal) {
  const hoje = hojeISO(APP_CONFIG.fusoHorario);
  limpar(principal);

  const corpo = el('div', { class: 'hoje-corpo' });
  principal.append(
    el('header', { class: 'tela-cab' },
      el('h1', { class: 'tela-titulo' }, el('span', { class: 'pincelada' }, TEXTOS.hoje.titulo)),
      el('p', { class: 'tela-sub' }, formatarDataLonga(hoje))),
    corpo,
  );

  const desenhar = () => desenharLista(corpo, hoje, desenhar);

  if (store.jaCarregou) desenhar();
  else corpo.append(estadoCarregando('Montando a lista do dia…'));

  // Atualiza em segundo plano: a outra operadora pode ter registrado contatos.
  try {
    const mudou = await store.carregar();
    if (mudou || !store.jaCarregou) desenhar();
  } catch (erro) {
    registrarErro(erro, 'carregar lista do dia');
    if (!store.jaCarregou) {
      limpar(corpo).append(estadoErro(mensagemParaOperador(erro, 'carregar'), () => telaHoje(principal)));
    } else {
      avisar(mensagemParaOperador(erro, 'carregar'), 'erro');
    }
  }
}

function desenharLista(corpo, hoje, redesenhar) {
  const lista = montarListaDoDia({
    clientes: store.clientes,
    contatos: store.contatos,
    hoje,
    cfg: RECONTATO_CONFIG,
    limiteDiario: APP_CONFIG.lista.limiteDiario,
  });
  limpar(corpo);

  // Progresso do dia
  const pct = Math.min(100, Math.round((lista.feitosHoje / lista.limiteDiario) * 100));
  corpo.append(
    el('div', { class: 'progresso' },
      el('div', {
        class: 'progresso-barra', role: 'progressbar',
        'aria-valuemin': 0, 'aria-valuemax': lista.limiteDiario, 'aria-valuenow': lista.feitosHoje,
        'aria-label': 'Contatos feitos hoje',
      }, el('span', { class: 'progresso-preenchido', style: `width:${pct}%` })),
      el('p', { class: 'progresso-texto' }, TEXTOS.hoje.progresso(lista.feitosHoje, lista.limiteDiario))),
  );

  if (lista.itens.length === 0) {
    const metaCumprida = lista.feitosHoje >= lista.limiteDiario;
    corpo.append(el('div', { class: 'estado' },
      el('p', { class: 'estado-titulo' }, metaCumprida ? TEXTOS.hoje.metaTitulo : TEXTOS.hoje.vazioTitulo),
      el('p', {}, metaCumprida ? TEXTOS.hoje.metaTexto : TEXTOS.hoje.vazioTexto),
      metaCumprida ? null : el('a', { href: '#/clientes/novo', class: 'btn btn-primario' }, 'Cadastrar cliente'),
    ));
    return;
  }

  const ol = el('ol', { class: 'fila' });
  for (const item of lista.itens) ol.append(cartao(item, hoje, redesenhar));
  corpo.append(ol);

  const restantes = lista.totalPendentes - lista.itens.length;
  if (restantes > 0) corpo.append(el('p', { class: 'nota' }, TEXTOS.hoje.restantes(restantes)));
}

function cartao(item, hoje, redesenhar) {
  const { cliente, regra } = item;
  const mensagem = montarMensagem(regra.mensagem, cliente, APP_CONFIG.loja);

  const botaoContatei = el('button', {
    type: 'button', class: 'btn btn-secundario',
    onclick: () => registrarResultado(item, hoje, redesenhar),
  }, icone('check'), 'Contatei');

  const li = el('li', { class: 'contato', dataset: { tom: regra.tom || 'neutro' } },
    el('div', { class: 'contato-motivo' },
      el('span', { class: 'selo' }, regra.motivo),
      item.tentativa > 1 ? el('span', { class: 'tentativa' }, `${item.tentativa}ª tentativa`) : null),
    el('h2', { class: 'contato-nome' }, el('a', { href: `#/cliente/${encodeURIComponent(cliente.id)}` }, cliente.nome)),
    el('p', { class: 'contato-detalhe' }, montarDetalhe(item, hoje)),
    el('div', { class: 'contato-acoes' },
      el('a', {
        class: 'btn btn-primario', href: linkWhatsApp(cliente.whatsapp, mensagem),
        target: '_blank', rel: 'noopener noreferrer',
        // Depois de abrir o WhatsApp, destaca o "Contatei" para o operador não esquecer.
        onclick: () => li.classList.add('aberto'),
      }, icone('conversa'), 'WhatsApp'),
      botaoContatei),
  );
  return li;
}

/** Janela "Como foi o contato?" — resultado em 1 toque, observação opcional. */
async function registrarResultado(item, hoje, redesenhar) {
  const { cliente, regra } = item;
  const nome = primeiroNome(cliente.nome);

  const gravou = await abrirDialogo({
    titulo: TEXTOS.hoje.perguntaResultado(nome),
    classe: 'dialogo-resultado',
    montar: (fechar) => {
      const obs = el('textarea', { id: 'obs-contato', rows: 2, maxlength: 500, placeholder: 'Ex.: pediu para chamar no sábado' });
      const erro = el('p', { class: 'erro-form', role: 'alert' });
      const botoes = [];

      const aviso = el('p', { class: 'aviso-confirmar', hidden: true }, TEXTOS.hoje.confirmarNaoQuer(nome));
      let armado = null; // resultado aguardando o segundo toque

      const gravar = async (resultado, botao) => {
        // Resultados sensíveis (ex.: "Não quer contato") pedem um segundo toque.
        if (resultado.confirmar && armado !== resultado.id) {
          armado = resultado.id;
          aviso.hidden = false;
          botao.textContent = 'Toque de novo para confirmar';
          botao.classList.add('armado');
          return;
        }
        erro.textContent = '';
        botoes.forEach((b) => { b.disabled = true; });
        try {
          const r = await dataService.registrarContato({
            clienteId: cliente.id,
            dia: hoje,
            motivoId: regra.id,
            motivoNome: regra.motivo,
            chaveCiclo: item.chaveCiclo,
            resultado: resultado.id,
            observacao: obs.value.trim(),
          });
          store.adicionarContatoLocal(r.contato);
          if (r.cliente) store.salvarClienteLocal(r.cliente);
          fechar(resultado);
        } catch (falha) {
          registrarErro(falha, 'registrar contato');
          erro.textContent = mensagemParaOperador(falha, 'salvar');
          botoes.forEach((b) => { b.disabled = false; });
        }
      };

      for (const resultado of RECONTATO_CONFIG.resultados) {
        const botao = el('button', {
          type: 'button', class: `btn btn-resultado btn-${resultado.tom || 'neutro'}`,
          onclick: () => gravar(resultado, botao),
        }, resultado.rotulo);
        botoes.push(botao);
      }

      return el('div', {},
        el('p', { class: 'dialogo-texto' }, `Motivo: ${regra.motivo}`),
        el('div', { class: 'resultados' }, botoes),
        aviso,
        el('div', { class: 'campo' },
          el('label', { for: 'obs-contato' }, 'Observação (opcional)'), obs),
        erro);
    },
  });

  if (gravou) {
    avisar(gravou.bloqueiaCliente ? TEXTOS.hoje.bloqueado : TEXTOS.hoje.registrado);
    redesenhar();
  }
}
