/**
 * Adaptador de DEMONSTRAÇÃO: grava no próprio navegador (localStorage).
 * Usado quando APP_CONFIG.api.url está vazio — serve para treinar a equipe e
 * testar a interface sem planilha. Imita as regras do backend (Code.gs).
 */
import { APP_CONFIG } from '../../config/app.config.js';
import { AppError } from '../../core/erros.js';
import { hojeISO, somarDias, somarMeses } from '../../services/datas.js';

const CHAVE = 'mmcrm.demo.dados';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function novoId() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function exemplo() {
  const hoje = hojeISO(APP_CONFIG.fusoHorario);
  const agora = new Date().toISOString();
  const c = (nome, whatsapp, extra) => ({
    id: novoId(), nome, whatsapp, dataUltimaCompra: '', dataReceita: '', dataNascimento: '',
    observacao: '', consentimento: 'SIM', dataConsentimento: hoje, naoQuerContato: 'NAO',
    dataNaoQuerContato: '', criadoEm: agora, versao: agora, atualizadoPor: 'Demonstração', ...extra,
  });
  return {
    clientes: [
      c('Ana Beatriz Lima', '5585999110001', { dataUltimaCompra: somarDias(hoje, -8) }),
      c('Carlos Henrique Souza', '5585988220002', { dataUltimaCompra: somarMeses(hoje, -13), dataReceita: somarMeses(hoje, -13) }),
      c('Francisca Moreira', '5585997330003', { dataUltimaCompra: somarDias(somarMeses(hoje, -11), -5), observacao: 'Prefere contato à tarde.' }),
      c('João Pedro Alves', '5585996440004', { dataUltimaCompra: somarMeses(hoje, -20) }),
      c('Larissa Castro', '5585995550005', { dataUltimaCompra: somarMeses(hoje, -5), dataReceita: somarMeses(hoje, -6), dataNascimento: somarMeses(hoje, -5 * 12) }),
      c('Raimundo Nonato', '5585994660006', { dataUltimaCompra: somarMeses(hoje, -30), consentimento: 'NAO', dataConsentimento: hoje }),
      c('Sandra Rocha', '5585993770007', { dataUltimaCompra: somarDias(hoje, -2) }),
    ],
    contatos: [],
  };
}

function ler() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo) return salvo;
  } catch { /* recria */ }
  const dados = exemplo();
  gravar(dados);
  return dados;
}

function gravar(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (erro) {
    throw new AppError('servidor', '', erro);
  }
}

export function criarAdaptadorDemo() {
  const latencia = 250;

  return {
    async entrar({ login, senha }) {
      await espera(latencia);
      if (!login || !senha) throw new AppError('login_invalido');
      const nome = login.charAt(0).toUpperCase() + login.slice(1);
      return { token: `demo-${novoId()}`, nome, login };
    },

    async sair() {},

    async carregarTudo() {
      await espera(latencia);
      return structuredClone(ler());
    },

    async salvarCliente(token, entrada) {
      await espera(latencia);
      const dados = ler();
      const agora = new Date().toISOString();
      const hoje = hojeISO(APP_CONFIG.fusoHorario);
      const { versao, ...campos } = entrada;
      let atual = null;

      if (campos.id) {
        atual = dados.clientes.find((c) => c.id === campos.id);
        if (!atual) throw new AppError('nao_encontrado');
        if (versao && atual.versao !== versao) throw new AppError('conflito');
      }

      const cliente = {
        ...(atual || {}),
        ...campos,
        id: campos.id || novoId(),
        dataConsentimento: !atual || atual.consentimento !== campos.consentimento ? hoje : atual.dataConsentimento,
        dataNaoQuerContato: campos.naoQuerContato === 'SIM'
          ? (atual?.naoQuerContato === 'SIM' ? atual.dataNaoQuerContato : hoje)
          : '',
        criadoEm: atual?.criadoEm || agora,
        versao: agora,
        atualizadoPor: 'Demonstração',
      };

      if (atual) dados.clientes[dados.clientes.indexOf(atual)] = cliente;
      else dados.clientes.push(cliente);
      gravar(dados);
      return structuredClone(cliente);
    },

    async excluirCliente(token, id) {
      await espera(latencia);
      const dados = ler();
      const antes = dados.contatos.length;
      dados.clientes = dados.clientes.filter((c) => c.id !== id);
      dados.contatos = dados.contatos.filter((k) => k.clienteId !== id);
      gravar(dados);
      return { contatosRemovidos: antes - dados.contatos.length };
    },

    async registrarContato(token, entrada) {
      await espera(latencia);
      const dados = ler();
      const cliente = dados.clientes.find((c) => c.id === entrada.clienteId);
      if (!cliente) throw new AppError('nao_encontrado');
      const agora = new Date().toISOString();
      const contato = { ...entrada, id: novoId(), dataHora: agora, operador: 'Demonstração' };
      dados.contatos.push(contato);

      let clienteAtualizado;
      if (entrada.resultado === 'nao_quer') {
        cliente.naoQuerContato = 'SIM';
        cliente.dataNaoQuerContato = entrada.dia;
        cliente.versao = agora;
        clienteAtualizado = structuredClone(cliente);
      }
      gravar(dados);
      return { contato, cliente: clienteAtualizado };
    },
  };
}
