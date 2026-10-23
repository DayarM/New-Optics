/**
 * REGRAS DE RECONTATO — valores iniciais, editáveis.
 *
 * Cada regra tem: id, motivo (nome que o operador vê), condição, prioridade,
 * ativa (true/false) e mensagem do WhatsApp.
 *
 * - prioridade: 1 é a mais importante. Um cliente aparece uma vez só, com o
 *   motivo de menor número.
 * - condicao.tipo: um dos tipos abaixo (para criar um tipo novo, veja
 *   services/recontato.js → registrarTipoDeCondicao).
 *     dias_apos_compra          { dias, validoPorDias }
 *     antes_vencimento_receita  { diasAntes }
 *     apos_vencimento_receita   { validoPorDias }   (null = sem prazo)
 *     aniversario               { toleranciaDias }  (0 = só no dia)
 *     sem_compra_ha_meses       { meses }
 * - detalhe: frase curta no cartão. {quando} vira "há 12 dias", "em 3 dias"...
 * - mensagem: texto do WhatsApp. Variáveis: {nome} (primeiro nome), {loja} e {endereco}.
 * - tom: cor do selo do motivo ('alerta', 'info' ou 'neutro').
 */
export const RECONTATO_CONFIG = {
  validadeReceita: {
    padraoMeses: 12,
    // Menores de 7 anos (idade na data da receita) usam validade menor.
    criancas: { idadeMenorQueAnos: 7, meses: 6 },
  },

  regras: [
    {
      id: 'adaptacao',
      motivo: 'Adaptação',
      prioridade: 1,
      ativa: true,
      tom: 'info',
      condicao: { tipo: 'dias_apos_compra', dias: 7, validoPorDias: 21 },
      detalhe: 'Comprou {quando}',
      mensagem:
        'Olá, {nome}! Aqui é da {loja}. Passando para saber como está a adaptação aos seus óculos novos. ' +
        'Se sentir qualquer desconforto ou precisar de um ajuste, é só passar na loja. Estamos à disposição.',
    },
    {
      id: 'receita_vencida',
      motivo: 'Receita vencida',
      prioridade: 2,
      ativa: true,
      tom: 'alerta',
      condicao: { tipo: 'apos_vencimento_receita', validoPorDias: null },
      detalhe: 'Receita venceu {quando}',
      mensagem:
        'Olá, {nome}! Aqui é da {loja}. Sua receita de óculos já passou do prazo recomendado de revisão. ' +
        'Que tal agendar um novo exame de vista? Podemos ajudar com a indicação e com as lentes depois.',
    },
    {
      id: 'receita_vencendo',
      motivo: 'Receita vencendo',
      prioridade: 3,
      ativa: true,
      tom: 'alerta',
      condicao: { tipo: 'antes_vencimento_receita', diasAntes: 30 },
      detalhe: 'Receita vence {quando}',
      mensagem:
        'Olá, {nome}! Aqui é da {loja}. Sua receita de óculos vence em breve. ' +
        'É um bom momento para revisar o grau e conferir se os óculos ainda estão confortáveis. Conte com a gente.',
    },
    {
      id: 'aniversario',
      motivo: 'Aniversário',
      prioridade: 4,
      ativa: false, // desligado por padrão
      tom: 'neutro',
      condicao: { tipo: 'aniversario', toleranciaDias: 0 },
      detalhe: 'Faz aniversário hoje',
      mensagem:
        'Olá, {nome}! A equipe da {loja} deseja um feliz aniversário, com muita saúde. Um abraço!',
    },
    {
      id: 'cliente_sumido',
      motivo: 'Cliente sumido',
      prioridade: 5,
      ativa: true,
      tom: 'neutro',
      condicao: { tipo: 'sem_compra_ha_meses', meses: 18 },
      detalhe: 'Última compra {quando}',
      mensagem:
        'Olá, {nome}! Aqui é da {loja}. Faz um tempo que não nos vemos. ' +
        'Se quiser revisar seus óculos ou conhecer as novidades, será um prazer receber você na loja, ' +
        'na {endereco}.',
    },
  ],

  /**
   * Resultados do botão "Contatei" (1 toque). Cada um define a consequência:
   * - encerraMotivo: o motivo atual não volta mais neste ciclo.
   * - pausaDias: o cliente some da lista por N dias (qualquer motivo).
   * - maxTentativasPorMotivo: depois de N vezes, o motivo é encerrado.
   * - bloqueiaCliente: marca "Não quer contato" (LGPD) e tira o cliente da lista para sempre.
   * - confirmar: pede confirmação antes de gravar.
   */
  resultados: [
    {
      id: 'respondeu',
      rotulo: 'Respondeu / vai passar na loja',
      encerraMotivo: true,
      pausaDias: 15,
      tom: 'sucesso',
    },
    {
      id: 'nao_respondeu',
      rotulo: 'Não respondeu',
      pausaDias: 3,
      maxTentativasPorMotivo: 2,
      tom: 'neutro',
    },
    {
      id: 'nao_quer',
      rotulo: 'Não quer contato',
      bloqueiaCliente: true,
      confirmar: true,
      tom: 'perigo',
    },
  ],

  // Mensagem do botão WhatsApp na ficha (contato fora da lista do dia).
  mensagemAvulsa: 'Olá, {nome}! Aqui é da {loja}.',
};
