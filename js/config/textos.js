/**
 * Textos da interface e mensagens de erro em linguagem simples.
 * Centralizados aqui para revisar o tom (ou traduzir) sem mexer nas telas.
 */
export const TEXTOS = {
  erros: {
    // Por tipo de problema
    rede: 'Sem internet no momento. Verifique a conexão e tente de novo.',
    tempo: 'O sistema demorou para responder. Tente de novo.',
    sessao: 'Sua sessão terminou. Entre de novo para continuar.',
    login_invalido: 'Usuário ou senha incorretos.',
    bloqueado: 'Muitas tentativas de entrada. Aguarde 15 minutos e tente de novo.',
    conflito: 'Outra pessoa alterou este cliente agora há pouco. Abra a ficha de novo e refaça a alteração.',
    nao_encontrado: 'Este cliente não existe mais. Ele pode ter sido excluído por outra pessoa.',
    ocupado: 'O sistema está ocupado com outra gravação. Tente de novo em alguns segundos.',
    // Por ação (usado quando o tipo de problema é desconhecido)
    salvar: 'Não foi possível salvar. Tente de novo.',
    carregar: 'Não foi possível carregar os dados. Tente de novo.',
    excluir: 'Não foi possível excluir. Tente de novo.',
    entrar: 'Não foi possível entrar agora. Tente de novo.',
    generico: 'Algo deu errado. Tente de novo.',
  },

  hoje: {
    titulo: 'Quem contatar hoje',
    progresso: (feitos, limite) => `${feitos} de ${limite} contatos feitos hoje`,
    restantes: (n) => (n === 1 ? 'Mais 1 cliente aguarda para os próximos dias.' : `Mais ${n} clientes aguardam para os próximos dias.`),
    vazioTitulo: 'Ninguém para contatar hoje',
    vazioTexto: 'Cadastre clientes com data de compra ou de receita para o sistema sugerir contatos.',
    metaTitulo: 'Contatos do dia concluídos',
    metaTexto: 'Amanhã a lista traz novos clientes.',
    perguntaResultado: (nome) => `Como foi o contato com ${nome}?`,
    confirmarNaoQuer: (nome) => `${nome} não vai mais aparecer na lista e não deve receber mensagens. Confirmar?`,
    registrado: 'Contato registrado.',
    bloqueado: 'Cliente marcado como "Não quer contato".',
  },

  cliente: {
    salvo: 'Cliente salvo.',
    excluido: 'Cliente excluído.',
    confirmarExclusao: (nome) =>
      `Isso apaga o cadastro de ${nome} e todo o histórico de contatos. Não dá para desfazer.`,
    duplicado: (nome) => `Já existe ${nome} com este WhatsApp. Salvar mesmo assim?`,
  },
};
