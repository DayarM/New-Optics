/**
 * Regras de negócio de LEADS (Fase 2).
 * Valida (validacoes.js), registra datas de consentimento e chama o dataService.
 */
import { dataService } from '../data/dataService.js?v=9ece4c76cc';
import { APP_CONFIG } from '../config/app.config.js?v=9ece4c76cc';
import { AppError } from '../core/erros.js?v=9ece4c76cc';
import { hojeISO } from '../core/datas.js?v=9ece4c76cc';
import { validarLead } from './validacoes.js?v=9ece4c76cc';
import { ehVerdadeiro } from './recontatoService.js?v=9ece4c76cc';

export const leadsService = {
  async todos({ forcar = false } = {}) {
    return (await dataService.obterTudo({ forcar })).leads;
  },

  async detalhe(id) {
    const dados = await dataService.obterTudo();
    const lead = dados.leads.find((l) => l.id === id);
    if (!lead) throw new AppError('NAO_ENCONTRADO');
    const contatos = dados.contatos.filter((c) => c.lead_id === id)
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    return { lead, contatos };
  },

  async salvar(dados, anterior = null) {
    const hoje = hojeISO();
    const { valor, erros } = validarLead(dados, { hoje, ddi: APP_CONFIG.ddiPadrao });
    if (Object.keys(erros).length) throw new AppError('DADOS_INVALIDOS', { campos: erros });
    // LGPD: data do consentimento é guardada; some se for retirado.
    valor.consentimento_em = valor.consentimento ? (ehVerdadeiro(anterior?.consentimento) ? anterior.consentimento_em : hoje) : '';
    valor.motivo_proximo = valor.proximo_contato
      ? (anterior?.proximo_contato === valor.proximo_contato ? anterior.motivo_proximo : 'Retorno combinado com o lead')
      : '';
    if (anterior) valor.cliente_id = anterior.cliente_id || '';
    return dataService.salvarLead(valor);
  },

  /** Mudança rápida de status pela ficha do lead. */
  async mudarStatus(lead, status) {
    return dataService.salvarLead({ ...lead, status });
  },

  excluir: (id) => dataService.excluirLead(id),
  converter: (id) => dataService.converterLead(id),
};
