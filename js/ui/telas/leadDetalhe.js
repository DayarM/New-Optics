/**
 * TELA: Ficha do lead — contato, avanço no funil e conversão em cliente.
 */
import { h, montar } from '../../core/dom.js';
import { irPara } from '../../core/router.js';
import { leadsService } from '../../services/leadsService.js';
import { clientesService } from '../../services/clientesService.js';
import { formatarWhatsapp } from '../../services/mensagemService.js';
import { ehVerdadeiro } from '../../services/recontatoService.js';
import { REGRAS_RECONTATO } from '../../config/regras.config.js';
import { TEXTOS, OPCOES } from '../../config/textos.config.js';
import { formatarData, hojeISO, distanciaTexto } from '../../core/datas.js';
import { carregando, falhaCarregar, avisar, tratarErro, comCarregamento, confirmar, comIcone, chips } from '../componentes/ui.js';
import { abrirPainelContato } from '../componentes/painelContato.js';
import { ROTULO_STATUS } from './leads.js';

export async function telaLeadDetalhe(container, { id }) {
  montar(container, carregando());
  let d;
  try { d = await leadsService.detalhe(id); } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaLeadDetalhe(container, { id })));
    return;
  }
  const recarregar = () => telaLeadDetalhe(container, { id });
  const { lead, contatos } = d;
  const autorizado = ehVerdadeiro(lead.consentimento);
  const convertido = lead.status === 'convertido';
  const link = clientesService.linkContato(lead, lead.status === 'novo' ? 'leadNovo' : 'retorno');
  const hoje = hojeISO();

  const virarCliente = async (e) => {
    const ok = await confirmar({ titulo: `${lead.nome} virou cliente?`,
      texto: 'Vamos criar a ficha de cliente com nome, WhatsApp, autorização e observação deste lead.', botao: 'Criar ficha de cliente' });
    if (!ok) return;
    try {
      const r = await comCarregamento(e.target.closest('button'), 'Criando…', () => leadsService.converter(lead.id));
      avisar('Ficha de cliente criada.');
      irPara(`/clientes/${encodeURIComponent(r.cliente.id)}`);
    } catch (erro) { tratarErro(erro, { padrao: 'ERRO_SALVAR' }); }
  };

  // Status manual (exceto "convertido", que só acontece pelo botão "Virar cliente").
  const opcoesStatus = OPCOES.statusLead.filter((s) => s.chave !== 'convertido').map((s) => ({ valor: s.chave, rotulo: s.rotulo }));
  const seletorStatus = convertido ? null : chips({ rotulo: 'Status do lead', opcoes: opcoesStatus, valor: lead.status,
    aoMudar: async (status) => {
      try { await leadsService.mudarStatus(lead, status); avisar(`Status: ${ROTULO_STATUS[status]}.`); recarregar(); }
      catch (erro) { tratarErro(erro, { padrao: 'ERRO_SALVAR' }); recarregar(); }
    } });

  const rotulosResultado = Object.fromEntries(REGRAS_RECONTATO.resultados.map((r) => [r.chave, r.rotulo]));

  montar(container,
    h('a', { class: 'voltar', href: '#/leads' }, ...comIcone('chevronLeft', 'Leads')),
    h('section', { class: 'ficha' },
      h('div', { class: 'ficha-titulo' },
        h('h1', { class: 'titulo-tela' }, lead.nome),
        h('span', { class: `selo selo-status st-${lead.status}` }, ROTULO_STATUS[lead.status])),
      h('p', { class: 'ficha-tel num' }, formatarWhatsapp(lead.whatsapp)),
      h('dl', { class: 'ficha-dados' },
        item('Interesse', lead.interesse || 'Não informado'),
        item('Origem', lead.origem || 'Não informada'),
        item('Próximo contato', lead.proximo_contato ? `${formatarData(lead.proximo_contato)} (${distanciaTexto(lead.proximo_contato, hoje)})` : 'Não agendado'),
        item('Mensagens', autorizado ? 'Autorizadas' : 'Sem autorização')),
      lead.observacao && h('p', { class: 'ficha-obs' }, lead.observacao),
      convertido
        ? h('div', { class: 'acoes' }, lead.cliente_id &&
            h('a', { class: 'btn btn-principal', href: `#/clientes/${encodeURIComponent(lead.cliente_id)}` }, ...comIcone('users', 'Abrir ficha de cliente')))
        : h('div', { class: 'acoes' },
            link && autorizado
              ? h('a', { class: 'btn btn-whatsapp', href: link, target: '_blank', rel: 'noopener' }, ...comIcone('message', 'Chamar no WhatsApp'))
              : h('p', { class: 'aviso-inline' }, autorizado ? 'Número inválido. Edite o cadastro.' : 'Sem autorização para mensagens.'),
            autorizado && h('button', { class: 'btn btn-secundario', type: 'button',
              onclick: () => abrirPainelContato(lead, 'Contato com lead', recarregar, { tipo: 'lead' }) }, ...comIcone('check', 'Contatei')),
            h('button', { class: 'btn btn-secundario', type: 'button', onclick: virarCliente }, ...comIcone('userCheck', 'Virar cliente')),
            h('a', { class: 'btn btn-secundario', href: `#/leads/${encodeURIComponent(id)}/editar` }, ...comIcone('pencil', 'Editar')))),
    seletorStatus && h('section', { class: 'secao' }, h('h2', { class: 'subtitulo' }, 'Etapa no funil'), seletorStatus),
    h('section', { class: 'secao' },
      h('h2', { class: 'subtitulo' }, `Contatos (${contatos.length})`),
      contatos.length
        ? h('ul', { class: 'registros' }, contatos.map((c) => h('li', { class: 'registro' }, h('div', {},
            h('p', { class: 'registro-titulo' }, rotulosResultado[c.resultado] || c.resultado),
            h('p', { class: 'registro-sub' }, h('span', { class: 'num' }, formatarData(c.data)), c.operador && h('span', {}, c.operador)),
            c.observacao && h('p', { class: 'registro-obs' }, c.observacao)))))
        : h('p', { class: 'estado' }, 'Nenhum contato registrado.')),
    h('section', { class: 'zona-exclusao' },
      h('h2', {}, 'Excluir lead'),
      h('p', {}, 'Use quando a pessoa pedir para apagar os dados dela (LGPD).'),
      h('button', { class: 'btn btn-perigo-contorno', type: 'button', onclick: async (e) => {
        const ok = await confirmar({ titulo: `Excluir ${lead.nome}?`, texto: TEXTOS.exclusaoLeadAviso, botao: 'Excluir definitivamente', perigo: true });
        if (!ok) return;
        try {
          await comCarregamento(e.target.closest('button'), 'Excluindo…', () => leadsService.excluir(lead.id));
          avisar('Lead excluído.'); irPara('/leads');
        } catch (erro) { tratarErro(erro, { padrao: 'ERRO_EXCLUIR' }); }
      } }, ...comIcone('trash', 'Excluir lead'))));
}

function item(rotulo, valor) {
  return h('div', {}, h('dt', {}, rotulo), h('dd', {}, valor));
}
