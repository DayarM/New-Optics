/**
 * Painel do botão "Contatei".
 * Escolher o resultado já sugere a data do próximo contato (vinda do config);
 * o operador pode mudar a data ou deixar em branco.
 */
import { h, lerFormulario } from '../../core/dom.js?v=9ece4c76cc';
import { REGRAS_RECONTATO } from '../../config/regras.config.js?v=9ece4c76cc';
import { clientesService } from '../../services/clientesService.js?v=9ece4c76cc';
import { hojeISO, somarDias, formatarData } from '../../core/datas.js?v=9ece4c76cc';
import { abrirPainel, campo, avisar, tratarErro, comCarregamento, maisDetalhes } from './ui.js?v=9ece4c76cc';

/**
 * @param {object} pessoa  cliente ou lead
 * @param {string} motivo  por que o contato foi feito (ex.: "Pós-venda…")
 * @param {() => void} [aoSalvar]
 * @param {{tipo?: 'cliente'|'lead'}} [opcoes]
 */
export function abrirPainelContato(pessoa, motivo, aoSalvar, { tipo = 'cliente' } = {}) {
  const ehLead = tipo === 'lead';
  abrirPainel(`Contato com ${pessoa.nome}`, (fechar) => {
    const inputData = h('input', { type: 'date', name: 'proximo_contato', id: 'pc-data', min: somarDias(hojeISO(), 1) });
    const dica = h('p', { class: 'campo-ajuda', id: 'pc-dica' }, 'Deixe em branco para não agendar.');

    const aoEscolher = (chave) => {
      const s = clientesService.sugestaoReagendamento(chave);
      inputData.value = s.proximo_contato;
      dica.textContent = s.proximo_contato
        ? `Vai aparecer de novo em ${formatarData(s.proximo_contato)}. Você pode mudar a data.`
        : 'Não será reagendado. As lembranças automáticas continuam valendo.';
    };

    const form = h('form', { class: 'form', novalidate: true },
      h('fieldset', { class: 'grupo-opcoes cols-2' },
        h('legend', {}, 'Como foi?'),
        REGRAS_RECONTATO.resultados.map((r) => h('label', { class: 'opcao' },
          h('input', { type: 'radio', name: 'resultado', value: r.chave, required: true, onchange: () => aoEscolher(r.chave) }),
          h('span', {}, r.rotulo)))),
      h('div', { class: 'campo' },
        h('label', { for: 'pc-data' }, 'Próximo contato', h('span', { class: 'opcional' }, ' (opcional)')),
        inputData, dica),
      maisDetalhes(campo({ nome: 'observacao', rotulo: 'Anotação', tipo: 'textarea' })),
      h('button', { class: 'btn btn-principal', type: 'submit' }, 'Salvar contato'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = lerFormulario(form);
      try {
        await comCarregamento(form.querySelector('[type=submit]'), 'Salvando…', () =>
          clientesService.registrarContato(
            { ...dados, motivo, [ehLead ? 'lead_id' : 'cliente_id']: pessoa.id },
            ehLead ? pessoa : null));
        fechar();
        avisar('Contato salvo.');
        aoSalvar?.();
      } catch (erro) {
        tratarErro(erro, { form, padrao: 'ERRO_SALVAR' });
        // O erro de "resultado" aparece junto ao grupo de opções.
        if (erro.extra?.campos?.resultado) {
          form.querySelector('fieldset').append(h('p', { class: 'campo-erro', role: 'alert' }, erro.extra.campos.resultado));
        }
      }
    });
    return form;
  });
}
