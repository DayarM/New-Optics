/**
 * TELA: Novo cliente / Editar cliente.
 * Campos essenciais à vista; o resto em "Mais detalhes".
 */
import { h, montar, lerFormulario } from '../../core/dom.js';
import { irPara } from '../../core/router.js';
import { clientesService } from '../../services/clientesService.js';
import { formatarWhatsapp } from '../../services/mensagemService.js';
import { ehVerdadeiro } from '../../services/recontatoService.js';
import { hojeISO } from '../../core/datas.js';
import { TEXTOS } from '../../config/textos.config.js';
import { campo, maisDetalhes, avisar, tratarErro, comCarregamento, carregando, falhaCarregar, campoConsentimento, faixaCampanha, comIcone } from '../componentes/ui.js';

export async function telaClienteForm(container, { id } = {}) {
  let anterior = null;
  if (id) {
    montar(container, carregando());
    try {
      anterior = (await clientesService.detalhe(id)).cliente;
    } catch (erro) {
      montar(container, falhaCarregar(erro, () => telaClienteForm(container, { id })));
      return;
    }
  }
  const v = anterior || {};
  const hoje = hojeISO();

  const form = h('form', { class: 'form', novalidate: true },
    campo({ nome: 'nome', rotulo: 'Nome', valor: v.nome, obrigatorio: true, attrs: { autocomplete: 'name', autocapitalize: 'words' } }),
    campo({ nome: 'whatsapp', rotulo: 'WhatsApp com DDD', tipo: 'tel', valor: v.whatsapp ? formatarWhatsapp(v.whatsapp) : '', obrigatorio: true, attrs: { inputmode: 'tel', placeholder: '(85) 98888-7777' } }),
    campo({ nome: 'ultima_compra', rotulo: 'Data da última compra', tipo: 'date', valor: v.ultima_compra, attrs: { max: hoje },
      ajuda: 'Quando você registra uma compra, esta data é atualizada sozinha.' }),
    campoConsentimento(TEXTOS.consentimento, anterior ? ehVerdadeiro(v.consentimento) : null, TEXTOS.consentimentoAjuda),
    maisDetalhes(
      campo({ nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date', valor: v.data_nascimento, attrs: { max: hoje },
        ajuda: 'Usada para lembrar o aniversário.' }),
      campo({ nome: 'observacao', rotulo: 'Observação', tipo: 'textarea', valor: v.observacao })),
    h('div', { class: 'acoes' },
      h('button', { class: 'btn btn-principal', type: 'submit' }, ...comIcone('check', anterior ? 'Salvar alterações' : 'Salvar cliente')),
      h('a', { class: 'btn btn-texto', href: anterior ? `#/clientes/${encodeURIComponent(id)}` : '#/clientes' }, 'Cancelar')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const salvo = await comCarregamento(form.querySelector('[type=submit]'), 'Salvando…', () =>
        clientesService.salvarCliente({ ...lerFormulario(form), id: anterior?.id }, anterior));
      avisar(anterior ? 'Alterações salvas.' : 'Cliente cadastrado.');
      irPara(`/clientes/${encodeURIComponent(salvo.id)}`);
    } catch (erro) {
      tratarErro(erro, { form, padrao: 'ERRO_SALVAR' });
    }
  });

  montar(container,
    faixaCampanha(anterior ? 'Editar cliente' : 'Novo cliente', anterior ? anterior.nome : 'Preencha nome, WhatsApp e a autorização.'),
    form);
}
