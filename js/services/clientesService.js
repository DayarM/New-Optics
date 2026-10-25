/**
 * Regras de negócio de clientes, compras, receitas e contatos.
 * Valida (funções puras de validacoes.js), aplica regras e chama o dataService.
 * As telas só falam com este serviço — nunca com o dataService direto para gravar.
 */
import { dataService } from '../data/dataService.js?v=864615d145';
import { APP_CONFIG } from '../config/app.config.js?v=864615d145';
import { REGRAS_RECONTATO, MENSAGENS_WHATSAPP } from '../config/regras.config.js?v=864615d145';
import { AppError } from '../core/erros.js?v=864615d145';
import { hojeISO, ehDataISO } from '../core/datas.js?v=864615d145';
import { validarCliente, validarCompra, validarReceita } from './validacoes.js?v=864615d145';
import { gerarListaDoDia, calcularReagendamento, agruparHistorico, ehVerdadeiro, statusLeadAposContato } from './recontatoService.js?v=864615d145';
import { montarMensagem, linkWhatsapp } from './mensagemService.js?v=864615d145';

function exigirValido({ valor, erros }) {
  if (Object.keys(erros).length) throw new AppError('DADOS_INVALIDOS', { campos: erros });
  return valor;
}

export const clientesService = {
  async listaDoDia({ forcar = false } = {}) {
    const dados = await dataService.obterTudo({ forcar });
    return gerarListaDoDia(dados.clientes, dados, hojeISO(), REGRAS_RECONTATO);
  },

  async todos({ forcar = false } = {}) {
    return (await dataService.obterTudo({ forcar })).clientes;
  },

  /** Cliente + histórico ordenado (mais recente primeiro). */
  async detalhe(id) {
    const dados = await dataService.obterTudo();
    const cliente = dados.clientes.find((c) => c.id === id);
    if (!cliente) throw new AppError('NAO_ENCONTRADO');
    const hist = agruparHistorico(dados).get(id) || { contatos: [], compras: [], receitas: [] };
    const desc = (a, b) => String(b.data).localeCompare(String(a.data)) || String(b.criado_em).localeCompare(String(a.criado_em));
    return {
      cliente,
      contatos: hist.contatos.sort(desc),
      compras: hist.compras.sort(desc),
      receitas: hist.receitas.sort(desc),
    };
  },

  async salvarCliente(dados, anterior = null) {
    const hoje = hojeISO();
    const valor = exigirValido(validarCliente(dados, { hoje, ddi: APP_CONFIG.ddiPadrao }));
    // LGPD: registra quando o consentimento foi dado; apaga a data se for retirado.
    const tinha = ehVerdadeiro(anterior?.consentimento);
    valor.consentimento_em = valor.consentimento ? (tinha ? anterior.consentimento_em : hoje) : '';
    if (anterior) {
      valor.proximo_contato = anterior.proximo_contato || '';
      valor.motivo_proximo = anterior.motivo_proximo || '';
    }
    return dataService.salvarCliente(valor);
  },

  excluirCliente: (id) => dataService.excluirCliente(id),

  /** Sugestão de próximo contato ao escolher um resultado em "Contatei". */
  sugestaoReagendamento(chaveResultado) {
    return calcularReagendamento(chaveResultado, hojeISO(), REGRAS_RECONTATO);
  },

  /**
   * Registra um contato com um CLIENTE (cliente_id) ou um LEAD (lead_id).
   * @param {{cliente_id?, lead_id?, resultado, observacao, proximo_contato, motivo}} d
   * @param {object} [lead]  lead atual, para calcular o novo status do funil
   */
  async registrarContato(d, lead = null) {
    const hoje = hojeISO();
    const resultado = REGRAS_RECONTATO.resultados.find((r) => r.chave === d.resultado);
    const erros = {};
    if (!resultado) erros.resultado = 'Escolha como foi o contato.';
    if (d.proximo_contato && (!ehDataISO(d.proximo_contato) || d.proximo_contato <= hoje))
      erros.proximo_contato = 'Escolha uma data a partir de amanhã.';
    if (Object.keys(erros).length) throw new AppError('DADOS_INVALIDOS', { campos: erros });

    return dataService.registrarContato({
      cliente_id: d.cliente_id || '',
      lead_id: d.lead_id || '',
      resultado: resultado.chave,
      motivo: d.motivo || '',
      observacao: String(d.observacao || '').trim().slice(0, 500),
      proximo_contato: d.proximo_contato || '',
      motivo_proximo: d.proximo_contato ? (resultado.motivoRetorno || 'Retorno combinado') : '',
      status_lead: lead ? statusLeadAposContato(lead.status, resultado.chave, REGRAS_RECONTATO) : '',
    });
  },

  async salvarCompra(d) {
    return dataService.salvarCompra(exigirValido(validarCompra(d, { hoje: hojeISO() })));
  },

  async salvarReceita(d) {
    return dataService.salvarReceita(exigirValido(validarReceita(d, { hoje: hojeISO() })));
  },

  excluirRegistro: (tipo, id) => dataService.excluirRegistro(tipo, id),

  /** Link do WhatsApp já com a mensagem certa para o motivo. */
  linkContato(cliente, chaveMensagem = 'padrao') { // serve para cliente ou lead
    const modelo = MENSAGENS_WHATSAPP[chaveMensagem] || MENSAGENS_WHATSAPP.padrao;
    return linkWhatsapp(cliente.whatsapp, montarMensagem(modelo, cliente, APP_CONFIG.loja), APP_CONFIG.ddiPadrao);
  },
};
