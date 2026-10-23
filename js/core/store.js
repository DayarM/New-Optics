/**
 * Estado em memória (clientes e contatos já carregados).
 * As telas leem daqui; gravações passam pelo dataService e depois atualizam o estado.
 */
import { dataService } from '../data/dataService.js';

const IDADE_MAXIMA_MS = 60_000; // recarrega do servidor se os dados tiverem mais de 1 min

const estado = {
  clientes: [],
  contatos: [],
  carregadoEm: 0,
};

let carregando = null;

export const store = {
  get clientes() { return estado.clientes; },
  get contatos() { return estado.contatos; },
  get jaCarregou() { return estado.carregadoEm > 0; },

  /** Carrega do backend. Sem `forcar`, só busca se os dados estiverem velhos. */
  async carregar({ forcar = false } = {}) {
    if (!forcar && Date.now() - estado.carregadoEm < IDADE_MAXIMA_MS) return false;
    if (!carregando) {
      carregando = dataService.carregarTudo()
        .then((dados) => {
          estado.clientes = dados.clientes || [];
          estado.contatos = dados.contatos || [];
          estado.carregadoEm = Date.now();
          return true;
        })
        .finally(() => { carregando = null; });
    }
    return carregando;
  },

  clientePorId(id) {
    return estado.clientes.find((c) => c.id === id) || null;
  },

  contatosDoCliente(id) {
    return estado.contatos
      .filter((k) => k.clienteId === id)
      .sort((a, b) => String(b.dataHora || b.dia).localeCompare(String(a.dataHora || a.dia)));
  },

  salvarClienteLocal(cliente) {
    const i = estado.clientes.findIndex((c) => c.id === cliente.id);
    if (i >= 0) estado.clientes[i] = cliente;
    else estado.clientes.push(cliente);
  },

  removerClienteLocal(id) {
    estado.clientes = estado.clientes.filter((c) => c.id !== id);
    estado.contatos = estado.contatos.filter((k) => k.clienteId !== id);
  },

  adicionarContatoLocal(contato) {
    estado.contatos.push(contato);
  },

  limpar() {
    estado.clientes = [];
    estado.contatos = [];
    estado.carregadoEm = 0;
  },
};
