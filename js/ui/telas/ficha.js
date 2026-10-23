/**
 * Ficha do cliente: dados, histórico de contatos, editar (ação principal) e excluir (LGPD).
 */
import { APP_CONFIG } from '../../config/app.config.js';
import { RECONTATO_CONFIG } from '../../config/recontato.config.js';
import { TEXTOS } from '../../config/textos.js';
import { el, icone, limpar } from '../../core/dom.js';
import { mensagemParaOperador, registrarErro } from '../../core/erros.js';
import { navegar } from '../../core/router.js';
import { store } from '../../core/store.js';
import { dataService } from '../../data/dataService.js';
import { descreverRelativo, diasEntre, formatarDataBR, hojeISO } from '../../services/datas.js';
import { montarMensagem, vencimentoReceita } from '../../services/recontato.js';
import { formatarWhatsApp, linkWhatsApp } from '../../services/telefone.js';
import { primeiroNome } from '../../services/texto.js';
import { avisar } from '../componentes/aviso.js';
import { confirmar } from '../componentes/dialogo.js';
import { estadoCarregando, estadoErro } from '../layout.js';

const ROTULO_RESULTADO = Object.fromEntries(RECONTATO_CONFIG.resultados.map((r) => [r.id, r.rotulo]));

export async function telaFicha(principal, { id }) {
  limpar(principal);
  if (!store.jaCarregou) {
    principal.append(estadoCarregando());
    try {
      await store.carregar();
    } catch (erro) {
      registrarErro(erro, 'carregar ficha');
      limpar(principal).append(estadoErro(mensagemParaOperador(erro, 'carregar'), () => telaFicha(principal, { id })));
      return;
    }
    limpar(principal);
  }

  const cliente = store.clientePorId(id);
  if (!cliente) {
    principal.append(el('div', { class: 'estado' },
      el('p', { class: 'estado-titulo' }, 'Cliente não encontrado'),
      el('a', { href: '#/clientes', class: 'btn btn-primario' }, 'Voltar para clientes')));
    return;
  }

  const hoje = hojeISO(APP_CONFIG.fusoHorario);
  const venc = vencimentoReceita(cliente, RECONTATO_CONFIG.validadeReceita);
  const msg = montarMensagem(RECONTATO_CONFIG.mensagemAvulsa, cliente, APP_CONFIG.loja);

  const linhas = [
    ['WhatsApp', formatarWhatsApp(cliente.whatsapp)],
    ['Última compra', cliente.dataUltimaCompra ? formatarDataBR(cliente.dataUltimaCompra) : 'Não informada'],
    ['Receita', cliente.dataReceita
      ? formatarDataBR(cliente.dataReceita)
      : (cliente.dataUltimaCompra ? 'Não informada (usamos a data da compra)' : 'Não informada')],
    venc ? ['Revisão da receita', `${formatarDataBR(venc)} (${descreverRelativo(diasEntre(hoje, venc))})`] : null,
    cliente.dataNascimento ? ['Nascimento', formatarDataBR(cliente.dataNascimento)] : null,
    ['Autorizou mensagens', cliente.consentimento === 'SIM'
      ? `Sim${cliente.dataConsentimento ? `, em ${formatarDataBR(cliente.dataConsentimento)}` : ''}`
      : `Não${cliente.dataConsentimento ? ` (registrado em ${formatarDataBR(cliente.dataConsentimento)})` : ''}`],
    cliente.observacao ? ['Observação', cliente.observacao] : null,
  ].filter(Boolean);

  const alertaLGPD = cliente.naoQuerContato === 'SIM'
    ? el('p', { class: 'alerta' }, `Não quer contato desde ${formatarDataBR(cliente.dataNaoQuerContato) || 'data não registrada'}. Não aparece na lista do dia.`)
    : cliente.consentimento !== 'SIM'
      ? el('p', { class: 'alerta' }, 'Sem autorização para mensagens. Não aparece na lista do dia.')
      : null;

  const podeMensagem = cliente.consentimento === 'SIM' && cliente.naoQuerContato !== 'SIM';

  principal.append(
    el('a', { href: '#/clientes', class: 'voltar' }, icone('voltar'), 'Clientes'),
    el('header', { class: 'tela-cab' }, el('h1', { class: 'tela-titulo' }, cliente.nome)),
    alertaLGPD,
    el('dl', { class: 'dados' }, linhas.map(([t, v]) => el('div', { class: 'dados-linha' }, el('dt', {}, t), el('dd', {}, v)))),
    el('div', { class: 'acoes-tela' },
      el('a', { href: `#/cliente/${encodeURIComponent(cliente.id)}/editar`, class: 'btn btn-primario' }, icone('lapis'), 'Editar dados'),
      podeMensagem
        ? el('a', { href: linkWhatsApp(cliente.whatsapp, msg), target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-secundario' },
          icone('conversa'), 'WhatsApp')
        : null),
    secaoHistorico(store.contatosDoCliente(cliente.id)),
    el('div', { class: 'zona-exclusao' },
      el('button', { type: 'button', class: 'btn btn-texto btn-texto-perigo', onclick: () => excluir(cliente) },
        icone('lixo'), 'Excluir cliente')),
  );
}

function secaoHistorico(contatos) {
  const secao = el('section', { class: 'historico', 'aria-labelledby': 'titulo-historico' },
    el('h2', { id: 'titulo-historico', class: 'secao-titulo' }, 'Histórico de contatos'));
  if (contatos.length === 0) {
    secao.append(el('p', { class: 'nota' }, 'Nenhum contato registrado ainda.'));
    return secao;
  }
  secao.append(el('ol', { class: 'linha-tempo' }, contatos.map((k) =>
    el('li', {},
      el('p', { class: 'lt-topo' },
        el('strong', {}, formatarDataBR(k.dia)), el('span', { class: 'lt-motivo' }, k.motivoNome || 'Contato')),
      el('p', {}, ROTULO_RESULTADO[k.resultado] || k.resultado),
      k.observacao ? el('p', { class: 'lt-obs' }, k.observacao) : null,
      k.operador ? el('p', { class: 'lt-autor' }, `por ${k.operador}`) : null))));
  return secao;
}

async function excluir(cliente) {
  const ok = await confirmar({
    titulo: `Excluir ${primeiroNome(cliente.nome)}?`,
    texto: TEXTOS.cliente.confirmarExclusao(cliente.nome),
    confirmar: 'Excluir definitivamente',
    perigo: true,
  });
  if (!ok) return;
  try {
    await dataService.excluirCliente(cliente.id);
    store.removerClienteLocal(cliente.id);
    avisar(TEXTOS.cliente.excluido);
    navegar('#/clientes');
  } catch (erro) {
    registrarErro(erro, 'excluir cliente');
    avisar(mensagemParaOperador(erro, 'excluir'), 'erro');
  }
}
