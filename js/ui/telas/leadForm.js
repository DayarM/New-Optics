/**
 * TELA: Novo lead / Editar lead.
 */
import { h, montar, lerFormulario } from '../../core/dom.js?v=38e7358a80';
import { irPara } from '../../core/router.js?v=38e7358a80';
import { leadsService } from '../../services/leadsService.js?v=38e7358a80';
import { formatarWhatsapp } from '../../services/mensagemService.js?v=38e7358a80';
import { ehVerdadeiro } from '../../services/recontatoService.js?v=38e7358a80';
import { hojeISO } from '../../core/datas.js?v=38e7358a80';
import { TEXTOS, OPCOES } from '../../config/textos.config.js?v=38e7358a80';
import { campo, maisDetalhes, avisar, tratarErro, comCarregamento, carregando, falhaCarregar,
  campoConsentimento, faixaCampanha, comIcone } from '../componentes/ui.js?v=38e7358a80';

export async function telaLeadForm(container, { id } = {}) {
  let anterior = null;
  if (id) {
    montar(container, carregando());
    try { anterior = (await leadsService.detalhe(id)).lead; } catch (erro) {
      montar(container, falhaCarregar(erro, () => telaLeadForm(container, { id })));
      return;
    }
  }
  const v = anterior || {};

  const form = h('form', { class: 'form', novalidate: true },
    campo({ nome: 'nome', rotulo: 'Nome', valor: v.nome, obrigatorio: true, attrs: { autocomplete: 'name', autocapitalize: 'words' } }),
    campo({ nome: 'whatsapp', rotulo: 'WhatsApp com DDD', tipo: 'tel', valor: v.whatsapp ? formatarWhatsapp(v.whatsapp) : '', obrigatorio: true,
      attrs: { inputmode: 'tel', placeholder: '(85) 98888-7777' } }),
    campo({ nome: 'interesse', rotulo: 'Interesse', tipo: 'select', opcoes: OPCOES.interessesLead, valor: v.interesse }),
    campoConsentimento(TEXTOS.consentimento, anterior ? ehVerdadeiro(v.consentimento) : null,
      'Sem autorização, o lead fica cadastrado mas não aparece em "Contatar hoje".'),
    maisDetalhes(
      campo({ nome: 'origem', rotulo: 'Como conheceu a loja', tipo: 'select', opcoes: OPCOES.origensLead, valor: v.origem }),
      campo({ nome: 'proximo_contato', rotulo: 'Próximo contato', tipo: 'date', valor: v.proximo_contato, attrs: { min: hojeISO() },
        ajuda: 'Em branco: um lead novo aparece hoje em "Contatar hoje".' }),
      anterior && campo({ nome: 'status', rotulo: 'Status', tipo: 'select', valor: ROTULO(v.status),
        opcoes: OPCOES.statusLead.map((s) => s.rotulo) }),
      campo({ nome: 'observacao', rotulo: 'Observação', tipo: 'textarea', valor: v.observacao })),
    h('div', { class: 'acoes' },
      h('button', { class: 'btn btn-principal', type: 'submit' }, ...comIcone('check', anterior ? 'Salvar alterações' : 'Salvar lead')),
      h('a', { class: 'btn btn-texto', href: anterior ? `#/leads/${encodeURIComponent(id)}` : '#/leads' }, 'Cancelar')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = lerFormulario(form);
    // O select mostra o rótulo; a planilha guarda a chave.
    dados.status = anterior ? (OPCOES.statusLead.find((s) => s.rotulo === dados.status)?.chave || anterior.status) : 'novo';
    try {
      const salvo = await comCarregamento(form.querySelector('[type=submit]'), 'Salvando…', () =>
        leadsService.salvar({ ...dados, id: anterior?.id }, anterior));
      avisar(anterior ? 'Alterações salvas.' : 'Lead cadastrado.');
      irPara(`/leads/${encodeURIComponent(salvo.id)}`);
    } catch (erro) { tratarErro(erro, { form, padrao: 'ERRO_SALVAR' }); }
  });

  montar(container,
    faixaCampanha(anterior ? 'Editar lead' : 'Novo lead', anterior ? anterior.nome : 'Preencha nome, WhatsApp e a autorização.'),
    form);
}

const ROTULO = (chave) => OPCOES.statusLead.find((s) => s.chave === chave)?.rotulo || '';
