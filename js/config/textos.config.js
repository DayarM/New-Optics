/**
 * TEXTOS DA INTERFACE E MENSAGENS DE ERRO
 * Linguagem simples, sem termos técnicos. O código de erro (à esquerda)
 * vem do servidor ou do app; o texto (à direita) é o que o operador lê.
 */

export const MENSAGENS_ERRO = {
  SEM_CONEXAO: 'Sem conexão com a internet. Verifique o Wi-Fi e tente de novo.',
  TEMPO_ESGOTADO: 'O sistema demorou para responder. Tente de novo em instantes.',
  SESSAO_EXPIRADA: 'Sua sessão terminou. Entre de novo para continuar.',
  LOGIN_INVALIDO: 'Usuário ou senha não conferem.',
  LOGIN_BLOQUEADO: 'Muitas tentativas. Aguarde 5 minutos e tente de novo.',
  NAO_ENCONTRADO: 'Este cadastro não foi encontrado. Ele pode ter sido excluído por outra pessoa.',
  DADOS_INVALIDOS: 'Alguns campos precisam de ajuste. Confira os itens em destaque.',
  OCUPADO: 'O sistema está ocupado salvando outro registro. Tente de novo.',
  ERRO_SALVAR: 'Não foi possível salvar. Tente de novo.',
  ERRO_CARREGAR: 'Não foi possível carregar os dados. Tente de novo.',
  ERRO_EXCLUIR: 'Não foi possível excluir. Tente de novo.',
  JA_CONVERTIDO: 'Este lead já virou cliente.',
  DESCONHECIDO: 'Algo deu errado. Tente de novo.',
};

export const TEXTOS = {
  consentimento:
    'Autorizou receber mensagens da loja pelo WhatsApp?',
  consentimentoAjuda:
    'Sem essa autorização, o cliente fica cadastrado mas não aparece em "Contatar hoje".',
  exclusaoLeadAviso:
    'Isto apaga o lead e os contatos registrados com ele. Não dá para desfazer.',
  exportarAviso:
    'O arquivo contém dados pessoais. Guarde em local seguro e apague quando não precisar mais.',
  exclusaoAviso:
    'Isto apaga o cliente e todo o histórico dele (compras, receitas e contatos). Não dá para desfazer.',
  demoAviso:
    'Modo demonstração: os dados ficam só neste aparelho.',
};

export const OPCOES = {
  formasPagamento: ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Crediário', 'Outro'],
  origensLead: ['Instagram', 'Indicação', 'Passou na loja', 'Campanha', 'WhatsApp', 'Outro'],
  interessesLead: ['Óculos de grau', 'Óculos de sol', 'Lente de contato', 'Óculos infantil', 'Exame de vista', 'Outro'],
  /** Funil de leads, na ordem. */
  statusLead: [
    { chave: 'novo', rotulo: 'Novo' },
    { chave: 'em_contato', rotulo: 'Em contato' },
    { chave: 'agendado', rotulo: 'Agendado' },
    { chave: 'convertido', rotulo: 'Virou cliente' },
    { chave: 'perdido', rotulo: 'Perdido' },
  ],
};
