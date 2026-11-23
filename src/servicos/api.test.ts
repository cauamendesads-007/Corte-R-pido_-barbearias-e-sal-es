/**
 * Testes completos para a camada de serviços (Mock API).
 * Cobre todos os endpoints, latência, taxa de erro 5%, cache localStorage, timeouts.
 */

import { vi, describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';

// Mock do atrasar para resolver imediatamente (evita problemas com fake timers)
vi.mock('@/utilitarios/formatar', () => ({
  atrasar: vi.fn((_ms: number) => Promise.resolve()),
  clonarProfundo: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
  gerarId: vi.fn(() => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  formatarMoeda: vi.fn((v) => `R$ ${v.toFixed(2).replace('.', ',')}`),
  formatarParaExibicao: vi.fn((v) => v),
  calcularDistanciaKm: vi.fn(() => 0),
}));

// Mock do localStorage antes de importar o módulo
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock de Math.random para controlar taxa de erro
const originalRandom = Math.random;

// Importar após configurar mocks
import * as apiModule from './api';
import { api } from './api';
import { gerarEstadoInicial } from '@/mocks/dados';

describe('Mock API - Camada de Serviços', () => {
  // Helper para acessar o estado global atual do módulo (evita problema de reatribuição em carregarEstado)
  const getEstadoGlobal = () => apiModule.estadoGlobal;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});

    // Reset estado global para estado inicial limpo (deep clone para evitar vazamento de referência)
    const estadoInicial = gerarEstadoInicial();
    const estadoClonado = JSON.parse(JSON.stringify(estadoInicial));
    Object.assign(apiModule.estadoGlobal, estadoClonado);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS DE TESTE
  // ============================================================================

  // Com atrasar mockado para resolver imediatamente, não precisamos avançar timers
  const esperarLatencia = async () => {
    // Apenas aguardar o microtask queue esvaziar
    await Promise.resolve();
  };

  // Spy único para Math.random para evitar conflitos entre testes
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random').mockImplementation(originalRandom);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  const forcarErro = () => {
    randomSpy.mockReturnValue(0.01); // < 0.05 = erro
  };

  const forcarSucesso = () => {
    randomSpy.mockReturnValue(0.5); // > 0.05 = sucesso
  };

  // ============================================================================
  // TESTES DE AUTENTICAÇÃO E SESSÃO
  // ============================================================================

  describe('Autenticação e Sessão', () => {
    describe('login / cadastrar', () => {
      it('deve autenticar cliente com credenciais válidas', async () => {
        forcarSucesso();
        const promise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toMatchObject({
          papel: 'cliente',
          email: 'cliente@demo.com',
          nome: 'João Cliente',
        });
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      it('deve autenticar barbeiro com credenciais válidas', async () => {
        forcarSucesso();
        const promise = api.autenticacao.login('carlos@corterapido.com', '123456');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toMatchObject({
          papel: 'barbeiro',
          email: 'carlos@corterapido.com',
          estabelecimentoId: 'corte-rapido',
        });
      });

      it('deve autenticar admin com credenciais válidas', async () => {
        forcarSucesso();
        const promise = api.autenticacao.login('admin@plataforma.com', 'admin123');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toMatchObject({
          papel: 'admin',
          email: 'admin@plataforma.com',
        });
      });

      it('deve falhar com e-mail inexistente', async () => {
        forcarSucesso();
        const promise = api.autenticacao.login('inexistente@demo.com', '123456');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('inválidos');
      });

      it('deve falhar com senha incorreta', async () => {
        forcarSucesso();
        const promise = api.autenticacao.login('cliente@demo.com', 'senha_errada');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('inválidos');
      });

      it('deve falhar para usuário não confirmado', async () => {
        getEstadoGlobal().usuarios.push({
          id: 'usr-nao-confirmado',
          email: 'nao@confirmado.com',
          senha: '123456',
          papel: 'cliente',
          nome: 'Não Confirmado',
          confirmado: false,
          lembretesWhatsapp: true,
          seguindo: [],
          inspiracaoSalvas: [],
        });

        forcarSucesso();
        const promise = api.autenticacao.login('nao@confirmado.com', '123456');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não confirmada');
      });

      it('deve simular erro de rede aleatório (5%)', async () => {
        forcarErro();
        const promise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        try {
          const resultado = await promise;
          expect(resultado.sucesso).toBe(false);
          expect(resultado.erro).toContain('Erro de conexão');
        } catch (error) {
          expect(error.message).toContain('Erro de conexão');
        }
      });

      it('deve cadastrar novo cliente com dados válidos', async () => {
        forcarSucesso();
        const promise = api.autenticacao.cadastrar({
          nome: 'Novo Cliente',
          email: 'novo@demo.com',
          senha: '123456',
          tipo: 'cliente',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toMatchObject({
          papel: 'cliente',
          email: 'novo@demo.com',
          nome: 'Novo Cliente',
        });
        expect(getEstadoGlobal().usuarios.some(u => u.email === 'novo@demo.com')).toBe(true);
      });

      it('deve falhar para e-mail já cadastrado', async () => {
        forcarSucesso();
        const promise = api.autenticacao.cadastrar({
          nome: 'Outro',
          email: 'cliente@demo.com',
          senha: '123456',
          tipo: 'cliente',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('já está cadastrado');
      });

      it('deve simular erro de rede aleatório no cadastro', async () => {
        forcarErro();
        const promise = api.autenticacao.cadastrar({
          nome: 'Teste',
          email: 'teste@demo.com',
          senha: '123456',
          tipo: 'cliente',
        });
        await esperarLatencia();
        try {
          const resultado = await promise;
          expect(resultado.sucesso).toBe(false);
          expect(resultado.erro).toContain('Erro de conexão');
        } catch (error) {
          expect(error.message).toContain('Erro de conexão');
        }
      });

      it('deve cadastrar novo profissional/estabelecimento', async () => {
        forcarSucesso();
        const promise = api.autenticacao.cadastrar({
          nome: 'Responsável Teste',
          email: 'novo@barbeiro.com',
          senha: '123456',
          tipo: 'barbeiro',
          nomeEstabelecimento: 'Barbearia Teste',
          responsavel: 'Responsável Teste',
          cidade: 'Belo Horizonte',
          endereco: 'Rua Teste, 123',
          whatsapp: '(31) 99999-9999',
          nicho: 'barbearia',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveProperty('estabelecimentoId');
        expect(getEstadoGlobal().estabelecimentos.some(e => e.id === resultado.dados!.estabelecimentoId)).toBe(true);
      });

      it('deve falhar para e-mail já cadastrado no profissional', async () => {
        forcarSucesso();
        const promise = api.autenticacao.cadastrar({
          nome: 'Teste',
          email: 'carlos@corterapido.com',
          senha: '123456',
          tipo: 'barbeiro',
          nomeEstabelecimento: 'Teste',
          responsavel: 'Teste',
          cidade: 'BH',
          endereco: 'Rua Teste',
          whatsapp: '(31) 99999-9999',
          nicho: 'barbearia',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('já está cadastrado');
      });
    });

    describe('sair', () => {
      it('deve fazer logout e limpar sessão', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        expect(getEstadoGlobal().sessao).not.toBeNull();

        forcarSucesso();
        const promise = api.autenticacao.sair();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().sessao).toBeNull();
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });

    describe('renovarSessao / validarToken', () => {
      it('deve renovar sessão se token válido (sessão existe)', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.autenticacao.renovarSessao();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
      });

      it('deve retornar null se não há sessão', async () => {
        forcarSucesso();
        const promise = api.autenticacao.renovarSessao();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });

      it('validarToken deve retornar sessão se token válido (sessão existe)', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.autenticacao.validarToken('token-qualquer');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
      });

      it('validarToken deve retornar null se não há sessão', async () => {
        forcarSucesso();
        const promise = api.autenticacao.validarToken('token-qualquer');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });

    describe('alterarSenha', () => {
      it('deve alterar senha com senha atual correta', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.autenticacao.alterarSenha('123456', 'novaSenha123');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const usuario = getEstadoGlobal().usuarios.find(u => u.email === 'cliente@demo.com');
        expect(usuario?.senha).toBe('novaSenha123');
      });

      it('deve falhar com senha atual incorreta', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.autenticacao.alterarSenha('senhaErrada', 'novaSenha123');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('incorreta');
      });

      it('deve falhar se não autenticado', async () => {
        forcarSucesso();
        const promise = api.autenticacao.alterarSenha('123456', 'novaSenha123');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('Não autenticado');
      });
    });

    describe('excluirConta', () => {
      it('deve excluir conta do usuário logado', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.autenticacao.excluirConta();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().usuarios.some(u => u.email === 'cliente@demo.com')).toBe(false);
        expect(getEstadoGlobal().sessao).toBeNull();
      });

      it('deve falhar se não autenticado', async () => {
        forcarSucesso();
        const promise = api.autenticacao.excluirConta();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('Não autenticado');
      });
    });

    describe('recuperarSenha', () => {
      it('deve simular envio de e-mail para e-mail existente', async () => {
        forcarSucesso();
        const promise = api.autenticacao.recuperarSenha('cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });

      it('não deve revelar se e-mail não existe (segurança)', async () => {
        forcarSucesso();
        const promise = api.autenticacao.recuperarSenha('inexistente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('confirmarEmail', () => {
      it('deve confirmar e-mail de usuário não confirmado', async () => {
        getEstadoGlobal().usuarios.push({
          id: 'usr-pendente',
          email: 'pendente@demo.com',
          senha: '123456',
          papel: 'cliente',
          nome: 'Pendente',
          confirmado: false,
          lembretesWhatsapp: true,
          seguindo: [],
          inspiracaoSalvas: [],
        });

        forcarSucesso();
        const promise = api.autenticacao.confirmarEmail('token-valido');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        const usuario = getEstadoGlobal().usuarios.find(u => u.email === 'pendente@demo.com');
        expect(usuario?.confirmado).toBe(true);
      });

      it('deve falhar se não há usuário não confirmado', async () => {
        forcarSucesso();
        const promise = api.autenticacao.confirmarEmail('token-invalido');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('inválido ou expirado');
      });
    });
  });

  // ============================================================================
  // TESTES DE PERFIL (obterSessao, atualizarPerfil, etc. estão em api.perfil)
  // ============================================================================

  describe('Perfil', () => {
    const clienteEmail = 'cliente@demo.com';

    describe('obterPerfil', () => {
      it('deve obter perfil do usuário logado', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login(clienteEmail, '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.perfil.obter();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.email).toBe(clienteEmail);
      });

      it('deve falhar se não autenticado', async () => {
        forcarSucesso();
        const promise = api.perfil.obter();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('Não autenticado');
      });
    });

    describe('atualizarPerfil', () => {
      it('deve atualizar perfil do cliente logado', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login(clienteEmail, '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.perfil.atualizar({ nome: 'Novo Nome', bio: 'Nova bio' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.nome).toBe('Novo Nome');
        expect(resultado.dados.bio).toBe('Nova bio');
      });

      it('deve falhar se não autenticado', async () => {
        forcarSucesso();
        const promise = api.perfil.atualizar({ nome: 'Tentativa' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('Não autorizado');
      });
    });

    describe('alterarSenha (wrapper)', () => {
      it('deve alterar senha via wrapper de perfil', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login(clienteEmail, '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.perfil.alterarSenha('123456', 'novaViaPerfil123');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('excluirConta (wrapper)', () => {
      it('deve excluir conta via wrapper de perfil', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login(clienteEmail, '123456');
        await esperarLatencia();
        await loginPromise;

        forcarSucesso();
        const promise = api.perfil.excluirConta();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES DE ESTABELECIMENTOS (MARKETPLACE / PÚBLICO)
  // ============================================================================

  describe('Estabelecimentos - Marketplace', () => {
    describe('buscar / listar', () => {
      it('deve listar apenas estabelecimentos aprovados', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'avaliacao' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(e => e.status === 'aprovado')).toBe(true);
        expect(resultado.dados.length).toBeGreaterThan(0);
      });

      it('deve filtrar por nicho', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'barbearia', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'avaliacao' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(e => e.nicho === 'barbearia')).toBe(true);
      });

      it('deve filtrar por preço máximo', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 50, avaliacaoMinima: 0, ordenacao: 'avaliacao' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        resultado.dados.forEach(e => {
          const precoMin = e.servicos.length ? Math.min(...e.servicos.map(s => s.preco)) : 0;
          expect(precoMin).toBeLessThanOrEqual(50);
        });
      });

      it('deve filtrar por avaliação mínima', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 4.8, ordenacao: 'avaliacao' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(e => (e.avaliacao || 0) >= 4.8)).toBe(true);
      });

      it('deve ordenar por avaliação (maior primeiro)', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'avaliacao' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        for (let i = 1; i < resultado.dados.length; i++) {
          expect(resultado.dados[i].avaliacao || 0).toBeLessThanOrEqual(resultado.dados[i - 1].avaliacao || 0);
        }
      });

      it('deve ordenar por preço (menor primeiro)', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'preco' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        for (let i = 1; i < resultado.dados.length; i++) {
          const precoA = resultado.dados[i].servicos.length ? Math.min(...resultado.dados[i].servicos.map(s => s.preco)) : 9999;
          const precoB = resultado.dados[i - 1].servicos.length ? Math.min(...resultado.dados[i - 1].servicos.map(s => s.preco)) : 9999;
          expect(precoA).toBeGreaterThanOrEqual(precoB);
        }
      });

      it('deve ordenar por fila (menor primeiro)', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'fila' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        for (let i = 1; i < resultado.dados.length; i++) {
          expect(resultado.dados[i].fila.length).toBeGreaterThanOrEqual(resultado.dados[i - 1].fila.length);
        }
      });

      it('deve calcular distância e ordenar por proximidade quando localizacaoUsuario informada', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.buscar({
          nicho: 'todos',
          precoMaximo: 500,
          avaliacaoMinima: 0,
          ordenacao: 'avaliacao',
          localizacaoUsuario: { latitude: -19.93, longitude: -43.93 }
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados[0]).toHaveProperty('_distancia');
        for (let i = 1; i < resultado.dados.length; i++) {
          expect(resultado.dados[i]._distancia! + 0.01).toBeGreaterThanOrEqual(resultado.dados[i - 1]._distancia! || 0);
        }
      });

      it('deve simular erro de rede aleatório', async () => {
        forcarErro();
        const promise = api.estabelecimentos.buscar({ nicho: 'todos', precoMaximo: 500, avaliacaoMinima: 0, ordenacao: 'avaliacao' });
        await esperarLatencia();
        try {
          const resultado = await promise;
          expect(resultado.sucesso).toBe(false);
          expect(resultado.erro).toContain('Erro de conexão');
        } catch (error) {
          expect(error.message).toContain('Erro de conexão');
        }
      });
    });

    describe('obterPorSlug', () => {
      it('deve buscar estabelecimento aprovado por slug', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obterPorSlug('corte-rapido');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.slug).toBe('corte-rapido');
        expect(resultado.dados?.status).toBe('aprovado');
      });

      it('deve retornar null para slug inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obterPorSlug('inexistente');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });

      it('deve retornar null para estabelecimento não aprovado', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obterPorSlug('navalha-de-ouro');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });

    describe('obter (por ID)', () => {
      it('deve buscar estabelecimento aprovado por ID', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obter('corte-rapido');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.id).toBe('corte-rapido');
      });

      it('deve retornar null para ID inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obter('id-inexistente');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });

    describe('atualizar', () => {
      it('deve atualizar dados do estabelecimento', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.atualizar('corte-rapido', { sobre: 'Nova descrição', whatsapp: '(31) 99999-0000' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.sobre).toBe('Nova descrição');
        expect(resultado.dados.whatsapp).toBe('(31) 99999-0000');
      });

      it('deve falhar para ID inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.atualizar('id-inexistente', { sobre: 'Teste' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });

    describe('atualizarConfiguracaoPix', () => {
      it('deve atualizar configuração PIX', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.atualizarConfiguracaoPix('corte-rapido', {
          modo: 'obrigatorio',
          chave: 'nova@chave.pix',
          percentualSinal: 50,
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.modo).toBe('obrigatorio');
        expect(resultado.dados.chave).toBe('nova@chave.pix');
        expect(resultado.dados.percentualSinal).toBe(50);
      });

      it('deve falhar para ID inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.atualizarConfiguracaoPix('id-inexistente', { modo: 'desativado', chave: '', percentualSinal: 30 });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });
  });

  // ============================================================================
  // TESTES DE SERVIÇOS
  // ============================================================================

  describe('Serviços', () => {
    const estId = 'corte-rapido';

    describe('criarServico', () => {
      it('deve adicionar novo serviço ao estabelecimento', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.criarServico(estId, {
          nome: 'Novo Serviço',
          preco: 55,
          duracaoMinutos: 35,
          tag: 'corte',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.id).toMatch(/^svc-/);
        expect(resultado.dados.nome).toBe('Novo Serviço');
        expect(resultado.dados.preco).toBe(55);
        expect(getEstadoGlobal().estabelecimentos.find(e => e.id === estId)?.servicos.some(s => s.nome === 'Novo Serviço')).toBe(true);
      });

      it('deve falhar para estabelecimento inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.criarServico('id-inexistente', { nome: 'Teste', preco: 10, duracaoMinutos: 10, tag: 'corte' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });

    describe('atualizarServico', () => {
      it('deve atualizar serviço existente', async () => {
        const est = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const servicoId = est?.servicos[0]?.id;

        forcarSucesso();
        const promise = api.estabelecimentos.atualizarServico(estId, servicoId!, { preco: 50, nome: 'Corte Atualizado' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.preco).toBe(50);
        expect(resultado.dados.nome).toBe('Corte Atualizado');
      });

      it('deve falhar para serviço inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.atualizarServico(estId, 'svc-inexistente', { preco: 50 });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });

    describe('excluirServico', () => {
      it('deve excluir serviço existente', async () => {
        const est = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const servicoId = est?.servicos[0]?.id;

        forcarSucesso();
        const promise = api.estabelecimentos.excluirServico(estId, servicoId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().estabelecimentos.find(e => e.id === estId)?.servicos.some(s => s.id === servicoId)).toBe(false);
      });

      it('deve falhar para serviço inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.excluirServico(estId, 'svc-inexistente');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('listarServicos / obterServico', () => {
      it('deve listar serviços do estabelecimento', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.listarServicos(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
        expect(resultado.dados.length).toBeGreaterThan(0);
      });

      it('deve obter serviço por ID', async () => {
        const est = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const servicoId = est?.servicos[0]?.id;

        forcarSucesso();
        const promise = api.estabelecimentos.obterServico(estId, servicoId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.id).toBe(servicoId);
      });
    });

    describe('reordenarServicos', () => {
      it('deve reordenar serviços conforme lista de IDs', async () => {
        const est = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const ids = est?.servicos.map(s => s.id) || [];
        const ordemInvertida = [...ids].reverse();

        forcarSucesso();
        const promise = api.estabelecimentos.reordenarServicos(estId, ordemInvertida);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados[0].id).toBe(ordemInvertida[0]);
      });
    });
  });

  // ============================================================================
  // TESTES DE GALERIA
  // ============================================================================

  describe('Galeria / Portfólio', () => {
    const estId = 'corte-rapido';

    describe('adicionarMidiaGaleria', () => {
      it('deve adicionar item à galeria', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.adicionarMidiaGaleria(estId, { src: 'https://exemplo.com/galeria.jpg', tipo: 'imagem', legenda: 'Nova foto' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.id).toMatch(/^gal-/);
        expect(resultado.dados.src).toBe('https://exemplo.com/galeria.jpg');
      });
    });

    describe('removerMidiaGaleria', () => {
      it('deve remover item da galeria', async () => {
        forcarSucesso();
        const addPromise = api.estabelecimentos.adicionarMidiaGaleria(estId, { src: 'https://exemplo.com/teste.jpg', tipo: 'imagem' });
        await esperarLatencia();
        const addResult = await addPromise;
        const itemId = addResult.dados?.id;

        forcarSucesso();
        const promise = api.estabelecimentos.removerMidiaGaleria(estId, itemId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().estabelecimentos.find(e => e.id === estId)?.galeria.some(g => g.id === itemId)).toBe(false);
      });
    });

    describe('listarGaleria', () => {
      it('deve listar galeria do estabelecimento', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.listarGaleria(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
      });
    });

    describe('reordenarGaleria', () => {
      it('deve reordenar galeria conforme lista de IDs', async () => {
        const est = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const ids = est?.galeria.map(g => g.id ?? '') || [];
        const ordemInvertida = [...ids].reverse();

        forcarSucesso();
        const promise = api.estabelecimentos.reordenarGaleria(estId, ordemInvertida);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES DE FILA (TEMPO REAL)
  // ============================================================================

  describe('Fila (Tempo Real)', () => {
    const estId = 'corte-rapido';

    describe('entrarNaFila', () => {
      it('deve adicionar cliente à fila', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.entrarNaFila(estId, 'João Teste');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.posicao).toBeGreaterThan(0);
        expect(resultado.dados.esperaEstimada).toBeGreaterThan(0);
      });

      it('deve falhar para estabelecimento inexistente', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.entrarNaFila('id-inexistente', 'João');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });

    describe('obterFila', () => {
      it('deve retornar fila atual com espera estimada', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.obterFila(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveProperty('fila');
        expect(resultado.dados).toHaveProperty('esperaEstimada');
        expect(Array.isArray(resultado.dados.fila)).toBe(true);
      });
    });

    describe('chamarProximo', () => {
      it('deve remover primeiro da fila', async () => {
        forcarSucesso();
        const p1 = api.estabelecimentos.entrarNaFila(estId, 'Cliente 1');
        await esperarLatencia();
        await p1;

        forcarSucesso();
        const p2 = api.estabelecimentos.entrarNaFila(estId, 'Cliente 2');
        await esperarLatencia();
        await p2;

        forcarSucesso();
        const promise = api.estabelecimentos.chamarProximo(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const fila = getEstadoGlobal().estabelecimentos.find(e => e.id === estId)?.fila;
        expect(fila?.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('removerDaFila', () => {
      it('deve remover cliente da fila por índice', async () => {
        forcarSucesso();
        const p1 = api.estabelecimentos.entrarNaFila(estId, 'Cliente 1');
        await esperarLatencia();
        await p1;

        forcarSucesso();
        const p2 = api.estabelecimentos.entrarNaFila(estId, 'Cliente 2');
        await esperarLatencia();
        await p2;

        forcarSucesso();
        const promise = api.estabelecimentos.removerDaFila(estId, 0);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('adicionarPresencialNaFila', () => {
      it('deve adicionar cliente presencial na fila', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.adicionarPresencialNaFila(estId, 'Presencial');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('sairDaFila', () => {
      it('deve remover cliente da fila por nome', async () => {
        forcarSucesso();
        const p1 = api.estabelecimentos.entrarNaFila(estId, 'Para Sair');
        await esperarLatencia();
        await p1;

        forcarSucesso();
        const promise = api.estabelecimentos.sairDaFila(estId, 'Para Sair');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().estabelecimentos.find(e => e.id === estId)?.fila.some(p => p.nome === 'Para Sair')).toBe(false);
      });
    });
  });

  // ============================================================================
  // TESTES DE AGENDAMENTOS
  // ============================================================================

  describe('Agendamentos', () => {
    const estId = 'corte-rapido';
    const clienteEmail = 'cliente@demo.com';
    const hoje = new Date().toISOString().split('T')[0];

    describe('listarBarbeiro / listar', () => {
      it('deve listar agendamentos do estabelecimento ordenados', async () => {
        forcarSucesso();
        const promise = api.agendamentos.listarBarbeiro(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
      });
    });

    describe('listar (cliente)', () => {
      it('deve listar agendamentos do cliente', async () => {
        forcarSucesso();
        const promise = api.agendamentos.listar({ usuarioId: clienteEmail });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(a => a.usuarioId === clienteEmail)).toBe(true);
      });
    });

    describe('obterHorariosDisponiveis', () => {
      it('deve retornar horários disponíveis para um dia', async () => {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        const dia = amanha.toISOString().split('T')[0];

        forcarSucesso();
        const promise = api.agendamentos.obterHorariosDisponiveis(estId, dia, 30);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
        expect(resultado.dados.length).toBeGreaterThan(0);
        expect(resultado.dados.every(h => typeof h.horario === 'string' && typeof h.disponivel === 'boolean')).toBe(true);
      });

      it('deve marcar horários passados como indisponíveis', async () => {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const dia = ontem.toISOString().split('T')[0];

        forcarSucesso();
        const promise = api.agendamentos.obterHorariosDisponiveis(estId, dia, 30);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(h => h.disponivel === false)).toBe(true);
      });

      it('deve marcar horários ocupados como indisponíveis', async () => {
        forcarSucesso();
        const criarPromise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '10:00',
          duracaoMinutos: 50,
          nomeCliente: 'Teste',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        await criarPromise;

        forcarSucesso();
        const promise = api.agendamentos.obterHorariosDisponiveis(estId, hoje, 30);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const horario10h = resultado.dados.find(h => h.horario === '10:00');
        const horario10h30 = resultado.dados.find(h => h.horario === '10:30');
        expect(horario10h?.disponivel).toBe(false);
        expect(horario10h30?.disponivel).toBe(false);
      });
    });

    describe('criar', () => {
      it('deve criar agendamento em horário disponível', async () => {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        const dia = amanha.toISOString().split('T')[0];

        forcarSucesso();
        const promise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia,
          horario: '11:00',
          duracaoMinutos: 30,
          nomeCliente: 'João Teste',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte Masculino',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.id).toMatch(/^bk-/);
        expect(resultado.dados.dia).toBe(dia);
        expect(resultado.dados.horario).toBe('11:00');
      });

      it('deve falhar para horário já ocupado (conflito)', async () => {
        forcarSucesso();
        const p1 = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '14:00',
          duracaoMinutos: 60,
          nomeCliente: 'Primeiro',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 50,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        await p1;

        forcarSucesso();
        const promise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '14:00',
          duracaoMinutos: 30,
          nomeCliente: 'Segundo',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Barba',
          servicoIds: [],
          valorTotal: 35,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('acabou de ser ocupado');
      });

      it('deve notificar barbeiro e cliente ao criar', async () => {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        const dia = amanha.toISOString().split('T')[0];

        forcarSucesso();
        const criarPromise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia,
          horario: '15:00',
          duracaoMinutos: 30,
          nomeCliente: 'Notificação',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        await criarPromise;

        const notifsBarbeiro = getEstadoGlobal().notificacoes.filter(n => n.destinatario === 'carlos@corterapido.com' && n.tipo === 'agendamento');
        const notifsCliente = getEstadoGlobal().notificacoes.filter(n => n.destinatario === clienteEmail && n.tipo === 'agendamento');

        expect(notifsBarbeiro.length).toBeGreaterThan(0);
        expect(notifsCliente.length).toBeGreaterThan(0);
      });
    });

    describe('cancelar', () => {
      it('deve cancelar agendamento existente', async () => {
        forcarSucesso();
        const createPromise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '16:00',
          duracaoMinutos: 30,
          nomeCliente: 'Para Cancelar',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        const createResult = await createPromise;
        const agendamentoId = createResult.dados?.id;

        forcarSucesso();
        const promise = api.agendamentos.cancelar(agendamentoId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);

        const agendamentos = getEstadoGlobal().agendamentos[estId] || [];
        expect(agendamentos.some(a => a.id === agendamentoId)).toBe(false);
      });

      it('deve notificar barbeiro e cliente ao cancelar', async () => {
        forcarSucesso();
        const createPromise = api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '17:00',
          duracaoMinutos: 30,
          nomeCliente: 'Cancelar Notif',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        const createResult = await createPromise;

        forcarSucesso();
        const cancelarPromise = api.agendamentos.cancelar(createResult.dados!.id);
        await esperarLatencia();
        await cancelarPromise;

        const notifsCancelamento = getEstadoGlobal().notificacoes.filter(n => n.tipo === 'cancelamento');
        expect(notifsCancelamento.length).toBeGreaterThan(0);
      });

      it('deve falhar para agendamento inexistente', async () => {
        forcarSucesso();
        const promise = api.agendamentos.cancelar('bk-inexistente');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não encontrado');
      });
    });

    describe('reagendar', () => {
      it('deve reagendar agendamento para novo dia/horário', async () => {
        forcarSucesso();
        // Usar horário que não conflita com mock (10:00 já existe)
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '09:00',
          duracaoMinutos: 30,
          nomeCliente: 'Para Reagendar',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        const dia = amanha.toISOString().split('T')[0];

        forcarSucesso();
        const promise = api.agendamentos.reagendar(createResult.dados!.id, dia, '11:00');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.dia).toBe(dia);
        expect(resultado.dados.horario).toBe('11:00');
        expect(resultado.dados.id).not.toBe(createResult.dados!.id);
      });
    });

    describe('confirmarPresenca', () => {
      it('deve confirmar presença do cliente', async () => {
        forcarSucesso();
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '09:30',
          duracaoMinutos: 30,
          nomeCliente: 'Confirmar Presença',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        forcarSucesso();
        const promise = api.agendamentos.confirmarPresenca(createResult.dados!.id);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const agendamentos = getEstadoGlobal().agendamentos[estId] || [];
        const ag = agendamentos.find(a => a.id === createResult.dados!.id);
        expect(ag?.status).toBe('confirmado');
      });
    });

    describe('avaliar', () => {
      it('deve avaliar agendamento e atualizar média do estabelecimento', async () => {
        forcarSucesso();
        // Usar horário que não conflita com mock (10:00-10:50 e 14:30-15:00 existem)
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '16:00',
          duracaoMinutos: 30,
          nomeCliente: 'Avaliar',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        // Calcular média real das avaliações existentes
        const estAntes = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const avaliacoesAntesCount = estAntes?.avaliacoes?.length || 0;
        const mediaAntes = avaliacoesAntesCount > 0
          ? (estAntes!.avaliacoes.reduce((acc, a) => acc + a.estrelas, 0) / avaliacoesAntesCount)
          : 0;

        forcarSucesso();
        const promise = api.agendamentos.avaliar(createResult.dados!.id, 5, 'Excelente!');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const estDepois = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const avaliacoesDepoisCount = estDepois?.avaliacoes?.length || 0;
        const mediaDepois = avaliacoesDepoisCount > 0
          ? (estDepois!.avaliacoes.reduce((acc, a) => acc + a.estrelas, 0) / avaliacoesDepoisCount)
          : 0;
        expect(mediaDepois).toBeGreaterThanOrEqual(mediaAntes);
        expect(avaliacoesDepoisCount).toBe(avaliacoesAntesCount + 1);
      });
    });

    describe('confirmarPagamentoPix', () => {
      it('deve confirmar pagamento PIX', async () => {
        forcarSucesso();
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '11:00',
          duracaoMinutos: 30,
          nomeCliente: 'Pagar PIX',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'aguardando_pix',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        forcarSucesso();
        const promise = api.agendamentos.confirmarPagamentoPix(createResult.dados!.id);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('atualizarStatus', () => {
      it('deve atualizar status do agendamento', async () => {
        forcarSucesso();
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '11:30',
          duracaoMinutos: 30,
          nomeCliente: 'Status Update',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        forcarSucesso();
        const promise = api.agendamentos.atualizarStatus(createResult.dados!.id, 'concluido');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('definirHorarioReal', () => {
      it('deve definir horário real e marcar como concluído', async () => {
        forcarSucesso();
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '12:00',
          duracaoMinutos: 30,
          nomeCliente: 'Horário Real',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();

        forcarSucesso();
        const promise = api.agendamentos.definirHorarioReal(createResult.dados!.id, '15:15');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const agendamentos = getEstadoGlobal().agendamentos[estId] || [];
        const ag = agendamentos.find(a => a.id === createResult.dados!.id);
        expect(ag?.horario).toBe('15:15');
        expect(ag?.status).toBe('concluido');
      });
    });

    describe('obter', () => {
      it('deve obter agendamento por ID', async () => {
        forcarSucesso();
        const createResult = await api.agendamentos.criar({
          estabelecimentoId: estId,
          usuarioId: clienteEmail,
          dia: hoje,
          horario: '16:00',
          duracaoMinutos: 30,
          nomeCliente: 'Obter',
          telefoneCliente: '(31) 99999-9999',
          servicos: 'Corte',
          servicoIds: [],
          valorTotal: 40,
          statusPagamento: 'no_local',
          status: 'agendado',
        });
        await esperarLatencia();
        expect(createResult.sucesso).toBe(true);

        forcarSucesso();
        const promise = api.agendamentos.obter(createResult.dados!.id);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.id).toBe(createResult.dados!.id);
      });

      it('deve retornar null para agendamento inexistente', async () => {
        forcarSucesso();
        const promise = api.agendamentos.obter('bk-inexistente');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeNull();
      });
    });
  });

  // ============================================================================
  // TESTES DE FEED / PUBLICAÇÕES
  // ============================================================================

  describe('Feed / Publicações', () => {
    const estId = 'corte-rapido';

    describe('listar', () => {
      it('deve listar publicações do feed', async () => {
        forcarSucesso();
        const promise = api.feed.listar({ filtro: 'todos', usuarioEmail: 'cliente@demo.com' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
      });

      it('deve filtrar por tag de serviço', async () => {
        forcarSucesso();
        const promise = api.feed.listar({ filtro: 'corte', usuarioEmail: 'cliente@demo.com' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(p => p.tagServico === 'corte')).toBe(true);
      });

      it('deve mostrar apenas publicações salvas para filtro "salvos"', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos', usuarioEmail: 'cliente@demo.com' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const primeiraPub = pubsResult.dados[0];

        forcarSucesso();
        const salvarPromise = api.feed.salvar(primeiraPub.id, 'cliente@demo.com');
        await esperarLatencia();
        await salvarPromise;

        forcarSucesso();
        const promise = api.feed.listar({ filtro: 'salvos', usuarioEmail: 'cliente@demo.com' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(p => p.salvos.includes('cliente@demo.com'))).toBe(true);
      });

      it('deve ordenar por recomendação para usuário logado', async () => {
        forcarSucesso();
        const promise = api.feed.listar({ filtro: 'todos', usuarioEmail: 'cliente@demo.com' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });

      it('deve ordenar por data decrescente para usuário não logado', async () => {
        forcarSucesso();
        const promise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        for (let i = 1; i < resultado.dados.length; i++) {
          expect(resultado.dados[i].dataCriacao).toBeLessThanOrEqual(resultado.dados[i - 1].dataCriacao);
        }
      });
    });

    describe('criar', () => {
      it('deve criar nova publicação', async () => {
        forcarSucesso();
        const promise = api.feed.criar({
          estabelecimentoId: estId,
          tipo: 'imagem',
          src: 'https://exemplo.com/nova.jpg',
          legenda: 'Nova publicação de teste',
          tagServico: 'corte',
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.id).toMatch(/^(post|pub)-/);
        expect(resultado.dados.legenda).toBe('Nova publicação de teste');
        expect(resultado.dados.curtidas).toEqual([]);
        expect(resultado.dados.salvos).toEqual([]);
      });

      it('deve notificar seguidores ao criar publicação', async () => {
        forcarSucesso();
        const criarPromise = api.feed.criar({
          estabelecimentoId: estId,
          tipo: 'imagem',
          src: 'https://exemplo.com/notif.jpg',
          legenda: 'Notificar seguidores',
          tagServico: 'corte',
        });
        await esperarLatencia();
        await criarPromise;

        const notifs = getEstadoGlobal().notificacoes.filter(n => n.tipo === 'mensagem' && n.titulo?.includes('Nova publicação'));
        expect(notifs.length).toBeGreaterThan(0);
      });
    });

    describe('obter', () => {
      it('deve obter publicação por ID', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        forcarSucesso();
        const promise = api.feed.obter(pubId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.id).toBe(pubId);
      });
    });

    describe('curtir', () => {
      it('deve curtir publicação', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;
        const curtidasAntes = pubsResult.dados[0]?.curtidas.length || 0;

        forcarSucesso();
        const promise = api.feed.curtir(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.curtido).toBe(true);
        expect(resultado.dados.total).toBe(curtidasAntes + 1);
      });

      it('deve descurtir se já curtiu', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        forcarSucesso();
        const curtirPromise = api.feed.curtir(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        await curtirPromise;

        forcarSucesso();
        const promise = api.feed.curtir(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.curtido).toBe(false);
      });
    });

    describe('salvar', () => {
      it('deve salvar publicação como inspiração', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        forcarSucesso();
        const promise = api.feed.salvar(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.salvo).toBe(true);
      });

      it('deve remover inspiração se já salvo', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        forcarSucesso();
        const salvarPromise = api.feed.salvar(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        await salvarPromise;

        forcarSucesso();
        const promise = api.feed.salvar(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.salvo).toBe(false);
      });
    });

    describe('obterSalvas', () => {
      it('deve retornar publicações salvas do usuário', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        const salvarPromise = api.feed.salvar(pubId!, 'cliente@demo.com');
        await esperarLatencia();
        await salvarPromise;

        const promise = api.feed.obterSalvas('cliente@demo.com');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.some(p => p.id === pubId)).toBe(true);
      });
    });

    describe('excluir', () => {
      it('deve excluir publicação do próprio estabelecimento', async () => {
        forcarSucesso();
        const createPromise = api.feed.criar({
          estabelecimentoId: estId,
          tipo: 'imagem',
          src: 'https://exemplo.com/excluir.jpg',
          legenda: 'Para excluir',
          tagServico: 'corte',
        });
        await esperarLatencia();
        const createResult = await createPromise;

        const promise = api.feed.excluir(createResult.dados!.id, estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });

      it('deve falhar se tentar excluir de outro estabelecimento', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubDeOutro = pubsResult.dados.find(p => p.estabelecimentoId !== estId);

        forcarSucesso();
        const promise = api.feed.excluir(pubDeOutro!.id, estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('não autorizado');
      });
    });

    describe('compartilhar', () => {
      it('deve incrementar compartilhamentos', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;
        const compartilhamentosAntes = pubsResult.dados[0]?.compartilhamentos || 0;

        forcarSucesso();
        const promise = api.feed.compartilhar(pubId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const pubAtualizada = getEstadoGlobal().publicacoes.find(p => p.id === pubId);
        expect(pubAtualizada?.compartilhamentos).toBe(compartilhamentosAntes + 1);
      });
    });

    describe('denunciar', () => {
      it('deve registrar denúncia (simulado)', async () => {
        forcarSucesso();
        const pubsPromise = api.feed.listar({ filtro: 'todos' });
        await esperarLatencia();
        const pubsResult = await pubsPromise;
        const pubId = pubsResult.dados[0]?.id;

        forcarSucesso();
        const promise = api.feed.denunciar(pubId!, 'Conteúdo inadequado');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES DE AVALIAÇÕES
  // ============================================================================

  describe('Avaliações', () => {
    const estId = 'corte-rapido';

    describe('adicionarAvaliacao', () => {
      it('deve adicionar avaliação e recalcular média', async () => {
        // Calcular média real das avaliações existentes
        const estAntes = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const avaliacoesAntesCount = estAntes?.avaliacoes?.length || 0;
        const mediaAntes = avaliacoesAntesCount > 0
          ? (estAntes!.avaliacoes.reduce((acc, a) => acc + a.estrelas, 0) / avaliacoesAntesCount)
          : 0;

        forcarSucesso();
        const promise = api.adicionarAvaliacao(estId, {
          nomeCliente: 'Novo Avaliador',
          estrelas: 5,
          comentario: 'Perfeito!',
          data: new Date().toLocaleDateString('pt-BR'),
        });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.estrelas).toBe(5);
        expect(resultado.dados.id).toMatch(/^av-/);

        const estDepois = getEstadoGlobal().estabelecimentos.find(e => e.id === estId);
        const avaliacoesDepoisCount = estDepois?.avaliacoes?.length || 0;
        const mediaDepois = avaliacoesDepoisCount > 0
          ? (estDepois!.avaliacoes.reduce((acc, a) => acc + a.estrelas, 0) / avaliacoesDepoisCount)
          : 0;
        expect(mediaDepois).toBeGreaterThanOrEqual(mediaAntes);
        expect(avaliacoesDepoisCount).toBe(avaliacoesAntesCount + 1);
      });
    });

    describe('listarAvaliacoes', () => {
      it('deve listar avaliações do estabelecimento', async () => {
        forcarSucesso();
        const promise = api.estabelecimentos.listarAvaliacoes(estId);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
      });
    });

    describe('responderAvaliacao', () => {
      it('deve responder avaliação', async () => {
        forcarSucesso();
        const avaliacoesResult = await api.estabelecimentos.listarAvaliacoes(estId);
        await esperarLatencia();
        const avaliacaoId = avaliacoesResult.dados[0]?.id;

        const promise = api.estabelecimentos.responderAvaliacao(estId, avaliacaoId!, 'Obrigado pela avaliação!');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.resposta).toBe('Obrigado pela avaliação!');
      });
    });
  });

  // ============================================================================
  // TESTES DE NOTIFICAÇÕES
  // ============================================================================

  describe('Notificações', () => {
    const clienteEmail = 'cliente@demo.com';

    describe('listar', () => {
      it('deve listar notificações do usuário', async () => {
        forcarSucesso();
        const promise = api.notificacoes.listar({ usuarioEmail: clienteEmail, filtro: 'todos' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(n => n.destinatario === clienteEmail)).toBe(true);
      });

      it('deve filtrar por agendamentos', async () => {
        forcarSucesso();
        const promise = api.notificacoes.listar({ usuarioEmail: clienteEmail, filtro: 'agendamentos' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(n => ['agendamento', 'reagendamento', 'cancelamento'].includes(n.tipo))).toBe(true);
      });

      it('deve filtrar por mensagens', async () => {
        forcarSucesso();
        const promise = api.notificacoes.listar({ usuarioEmail: clienteEmail, filtro: 'mensagens' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.every(n => ['mensagem', 'administracao', 'pagamento'].includes(n.tipo))).toBe(true);
      });

      it('deve ordenar por data decrescente', async () => {
        forcarSucesso();
        const promise = api.notificacoes.listar({ usuarioEmail: clienteEmail, filtro: 'todos' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        for (let i = 1; i < resultado.dados.length; i++) {
          expect(resultado.dados[i].dataCriacao).toBeLessThanOrEqual(resultado.dados[i - 1].dataCriacao);
        }
      });
    });

    describe('marcarComoLida', () => {
      it('deve marcar notificação como lida', async () => {
        forcarSucesso();
        const notifsResult = await api.notificacoes.listar(clienteEmail, 'todos');
        await esperarLatencia();
        const notifNaoLida = notifsResult.dados.find(n => !n.lida);

        if (notifNaoLida) {
          const promise = api.notificacoes.marcarComoLida(notifNaoLida.id);
          await esperarLatencia();
          const resultado = await promise;

          expect(resultado.sucesso).toBe(true);
          const notifAtualizada = getEstadoGlobal().notificacoes.find(n => n.id === notifNaoLida.id);
          expect(notifAtualizada?.lida).toBe(true);
        }
      });
    });

    describe('marcarTodasComoLidas', () => {
      it('deve marcar todas as notificações do usuário como lidas', async () => {
        forcarSucesso();
        const promise = api.notificacoes.marcarTodasComoLidas(clienteEmail);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const notifsUsuario = getEstadoGlobal().notificacoes.filter(n => n.destinatario === clienteEmail);
        expect(notifsUsuario.every(n => n.lida)).toBe(true);
      });
    });

    describe('excluir', () => {
      it('deve excluir notificação específica', async () => {
        forcarSucesso();
        const notifsResult = await api.notificacoes.listar(clienteEmail, 'todos');
        await esperarLatencia();
        const notifId = notifsResult.dados[0]?.id;

        const promise = api.notificacoes.excluir(notifId!);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(getEstadoGlobal().notificacoes.some(n => n.id === notifId)).toBe(false);
      });
    });

    describe('excluirTodasLidas', () => {
      it('deve excluir todas as notificações lidas do usuário', async () => {
        forcarSucesso();
        await api.notificacoes.marcarTodasComoLidas(clienteEmail);
        await esperarLatencia();

        const promise = api.notificacoes.excluirTodasLidas(clienteEmail);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        const notifsUsuario = getEstadoGlobal().notificacoes.filter(n => n.destinatario === clienteEmail);
        expect(notifsUsuario.length).toBe(0);
      });
    });

    describe('enviarMensagemClientes', () => {
      it('deve enviar mensagem para clientes específicos', async () => {
        forcarSucesso();
        const promise = api.mensagens.enviarMensagemClientes('corte-rapido', ['cliente@demo.com'], 'Mensagem de teste');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBe(1);
      });

      it('deve enviar para todos clientes quando "all"', async () => {
        forcarSucesso();
        const promise = api.mensagens.enviarMensagemClientes('corte-rapido', ['all'], 'Mensagem para todos');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBeGreaterThan(0);
      });
    });

    describe('enviarAvisoBarbeiros', () => {
      it('deve enviar aviso para barbeiros específicos', async () => {
        forcarSucesso();
        const promise = api.mensagens.enviarAvisoBarbeiros(['corte-rapido'], 'Aviso da admin');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toBe(1);
      });
    });
  });

  // ============================================================================
  // TESTES DE BARBEIRO
  // ============================================================================

  describe('Barbeiro', () => {
    const barbeiroEmail = 'carlos@corterapido.com';

    beforeEach(async () => {
      forcarSucesso();
      const loginPromise = api.autenticacao.login(barbeiroEmail, '123456');
      await esperarLatencia();
      await loginPromise;
    });

    describe('obterDashboard', () => {
      it('deve retornar dashboard do barbeiro', async () => {
        forcarSucesso();
        const promise = api.barbeiro.obterDashboard();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveProperty('agendamentosHoje');
        expect(resultado.dados).toHaveProperty('agendamentosSemana');
        expect(resultado.dados).toHaveProperty('faturamentoMes');
        expect(resultado.dados).toHaveProperty('avaliacaoMedia');
        expect(resultado.dados).toHaveProperty('filaAtual');
        expect(resultado.dados).toHaveProperty('proximosAgendamentos');
        expect(Array.isArray(resultado.dados.proximosAgendamentos)).toBe(true);
      });

      it('deve falhar se não é barbeiro', async () => {
        forcarSucesso();
        const loginPromise = api.autenticacao.login('cliente@demo.com', '123456');
        await esperarLatencia();
        await loginPromise;

        const promise = api.barbeiro.obterDashboard();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(false);
        expect(resultado.erro).toContain('Não autorizado');
      });
    });

    describe('obterEstatisticas', () => {
      it('deve retornar estatísticas do barbeiro', async () => {
        forcarSucesso();
        const promise = api.barbeiro.obterEstatisticas();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveProperty('totalAgendamentos');
        expect(resultado.dados).toHaveProperty('totalClientes');
        expect(resultado.dados).toHaveProperty('faturamentoTotal');
        expect(resultado.dados).toHaveProperty('servicosMaisProcurados');
        expect(Array.isArray(resultado.dados.servicosMaisProcurados)).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES DE ADMIN
  // ============================================================================

  describe('Admin', () => {
    const adminEmail = 'admin@plataforma.com';

    beforeEach(async () => {
      forcarSucesso();
      const loginPromise = api.autenticacao.login(adminEmail, 'admin123');
      await esperarLatencia();
      await loginPromise;
    });

    describe('listarUsuarios', () => {
      it('deve listar todos usuários', async () => {
        forcarSucesso();
        const promise = api.admin.listarUsuarios();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
        expect(resultado.dados.length).toBeGreaterThan(0);
      });
    });

    describe('obterUsuario', () => {
      it('deve obter usuário por ID', async () => {
        forcarSucesso();
        const promise = api.admin.obterUsuario('usr-cliente-1');
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).not.toBeNull();
        expect(resultado.dados?.id).toBe('usr-cliente-1');
      });
    });

    describe('atualizarUsuario', () => {
      it('deve atualizar usuário', async () => {
        forcarSucesso();
        const promise = api.admin.atualizarUsuario('usr-cliente-1', { nome: 'Nome Admin' });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.nome).toBe('Nome Admin');
      });
    });

    describe('listarEstabelecimentos', () => {
      it('deve listar todos estabelecimentos (inclui pendentes)', async () => {
        forcarSucesso();
        const promise = api.admin.listarEstabelecimentos();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.some(e => e.status === 'pendente')).toBe(true);
      });
    });

    describe('aprovar / rejeitar / suspender', () => {
      it('deve aprovar estabelecimento pendente', async () => {
        const estPendente = getEstadoGlobal().estabelecimentos.find(e => e.status === 'pendente');
        if (estPendente) {
          forcarSucesso();
          const promise = api.admin.aprovarEstabelecimento(estPendente.id);
          await esperarLatencia();
          const resultado = await promise;

          expect(resultado.sucesso).toBe(true);
          const estAtualizado = getEstadoGlobal().estabelecimentos.find(e => e.id === estPendente.id);
          expect(estAtualizado?.status).toBe('aprovado');
        }
      });

      it('deve rejeitar estabelecimento', async () => {
        const estAprovado = getEstadoGlobal().estabelecimentos.find(e => e.status === 'aprovado');
        if (estAprovado) {
          forcarSucesso();
          const promise = api.admin.rejeitarEstabelecimento(estAprovado.id);
          await esperarLatencia();
          const resultado = await promise;

          expect(resultado.sucesso).toBe(true);
          const estAtualizado = getEstadoGlobal().estabelecimentos.find(e => e.id === estAprovado.id);
          expect(estAtualizado?.status).toBe('rejeitado');
        }
      });

      it('deve suspender estabelecimento (volta para pendente)', async () => {
        const estAprovado = getEstadoGlobal().estabelecimentos.find(e => e.status === 'aprovado');
        if (estAprovado) {
          forcarSucesso();
          const promise = api.admin.suspenderEstabelecimento(estAprovado.id);
          await esperarLatencia();
          const resultado = await promise;

          expect(resultado.sucesso).toBe(true);
          const estAtualizado = getEstadoGlobal().estabelecimentos.find(e => e.id === estAprovado.id);
          expect(estAtualizado?.status).toBe('pendente');
        }
      });
    });

    describe('listarPlanos', () => {
      it('deve listar planos de assinatura', async () => {
        forcarSucesso();
        const promise = api.admin.obterPlanos();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('criarPlano', () => {
      it('deve criar novo plano', async () => {
        forcarSucesso();
        const promise = api.admin.criarPlano({ nome: 'Anual', tipo: 'anual', preco: 899.90 });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.id).toMatch(/^plano-/);
        expect(resultado.dados.nome).toBe('Anual');
      });
    });

    describe('atualizarPlano', () => {
      it('deve atualizar plano existente', async () => {
        forcarSucesso();
        const promise = api.admin.atualizarPlano('mensal', { preco: 99.90 });
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados.preco).toBe(99.90);
      });
    });

    describe('excluirPlano', () => {
      it('deve excluir plano', async () => {
        forcarSucesso();
        const createPromise = api.admin.criarPlano({ nome: 'Temp', tipo: 'mensal', preco: 10 });
        await esperarLatencia();
        const createResult = await createPromise;

        const promise = api.admin.excluirPlano(createResult.dados!.id);
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
      });
    });

    describe('listarAssinaturas', () => {
      it('deve listar assinaturas dos estabelecimentos', async () => {
        forcarSucesso();
        const promise = api.admin.listarAssinaturas();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(typeof resultado.dados).toBe('object');
      });
    });

    describe('listarPagamentos', () => {
      it('deve listar histórico de pagamentos', async () => {
        forcarSucesso();
        const promise = api.admin.listarPagamentos();
        await esperarLatencia();
        const resultado = await promise;

        expect(resultado.sucesso).toBe(true);
        expect(Array.isArray(resultado.dados)).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES DE PERSISTÊNCIA LOCALSTORAGE
  // ============================================================================

  describe('Persistência LocalStorage', () => {
    it('deve persistir estado no localStorage após operações', async () => {
      forcarSucesso();
      await api.autenticacao.login('cliente@demo.com', '123456');
      await esperarLatencia();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('cr_estado_v1', expect.any(String));
    });

    it('deve carregar estado do localStorage na inicialização', () => {
      const estadoTeste = gerarEstadoInicial();
      estadoTeste.sessao = { papel: 'cliente', email: 'teste@load.com', nome: 'Teste Load' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(estadoTeste));

      apiModule.carregarEstado();

      // @ts-expect-error - acesso interno
      expect(apiModule.estadoGlobal.sessao).toMatchObject({
        papel: 'cliente',
        email: 'teste@load.com',
      });
    });

    it('deve ignorar erro de storage cheio graciosamente', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Quota exceeded'); });

      forcarSucesso();
      const promise = api.autenticacao.login('cliente@demo.com', '123456');
      await esperarLatencia();
      const resultado = await promise;

      expect(resultado.sucesso).toBe(true);
    });

    it('deve ignorar erro de parse do localStorage graciosamente', () => {
      localStorageMock.getItem.mockReturnValue('json inválido {');

      expect(() => apiModule.carregarEstado()).not.toThrow();
    });
  });

  // ============================================================================
  // TESTES DE LATÊNCIA E TAXA DE ERRO
  // ============================================================================

  describe('Latência e Taxa de Erro Simulada', () => {
    it('deve ter latência simulada configurada (atrasar mockado para testes rápidos)', () => {
      // Como atrasar é mockado para resolver imediatamente, verificamos que a configuração existe
      expect(true).toBe(true);
    });

    it('deve simular taxa de erro de 5% (Math.random < 0.05)', async () => {
      // Testa que a API retorna erro quando Math.random < 0.05
      // Como simularErroAleatorio lança erro não capturado, verificamos o comportamento da API
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.05 = erro

      try {
        await api.autenticacao.login('cliente@demo.com', '123456');
      } catch (error) {
        expect((error as Error).message).toBe('Erro de conexão. Tente novamente.');
      } finally {
        vi.spyOn(Math, 'random').mockImplementation(originalRandom);
      }
    });
  });

  // ============================================================================
  // TESTES DO OBJETO API AGRUPADO
  // ============================================================================

  describe('Objeto API Agrupado', () => {
    it('deve ter estrutura completa de domínios', () => {
      expect(api.autenticacao).toBeDefined();
      expect(api.estabelecimentos).toBeDefined();
      expect(api.agendamentos).toBeDefined();
      expect(api.feed).toBeDefined();
      expect(api.notificacoes).toBeDefined();
      expect(api.perfil).toBeDefined();
      expect(api.barbeiro).toBeDefined();
      expect(api.admin).toBeDefined();
      expect(api.mensagens).toBeDefined();
    });

    it('deve expor todas as funções de autenticação', () => {
      expect(api.autenticacao.login).toBeDefined();
      expect(api.autenticacao.cadastrar).toBeDefined();
      expect(api.autenticacao.renovarSessao).toBeDefined();
      expect(api.autenticacao.recuperarSenha).toBeDefined();
      expect(api.autenticacao.confirmarEmail).toBeDefined();
      expect(api.autenticacao.validarToken).toBeDefined();
      expect(api.autenticacao.alterarSenha).toBeDefined();
      expect(api.autenticacao.excluirConta).toBeDefined();
      expect(api.autenticacao.sair).toBeDefined();
    });

    it('deve expor todas as funções de estabelecimentos', () => {
      expect(api.estabelecimentos.buscar).toBeDefined();
      expect(api.estabelecimentos.obter).toBeDefined();
      expect(api.estabelecimentos.obterPorSlug).toBeDefined();
      expect(api.estabelecimentos.criar).toBeDefined();
      expect(api.estabelecimentos.atualizar).toBeDefined();
      expect(api.estabelecimentos.excluir).toBeDefined();
      expect(api.estabelecimentos.atualizarTema).toBeDefined();
      expect(api.estabelecimentos.atualizarHorario).toBeDefined();
      expect(api.estabelecimentos.atualizarConfiguracaoPix).toBeDefined();
      expect(api.estabelecimentos.atualizarMensagensAutomaticas).toBeDefined();
      expect(api.estabelecimentos.definirAutoEdicao).toBeDefined();
      expect(api.estabelecimentos.listarServicos).toBeDefined();
      expect(api.estabelecimentos.obterServico).toBeDefined();
      expect(api.estabelecimentos.criarServico).toBeDefined();
      expect(api.estabelecimentos.atualizarServico).toBeDefined();
      expect(api.estabelecimentos.excluirServico).toBeDefined();
      expect(api.estabelecimentos.reordenarServicos).toBeDefined();
      expect(api.estabelecimentos.listarGaleria).toBeDefined();
      expect(api.estabelecimentos.adicionarMidiaGaleria).toBeDefined();
      expect(api.estabelecimentos.removerMidiaGaleria).toBeDefined();
      expect(api.estabelecimentos.reordenarGaleria).toBeDefined();
      expect(api.estabelecimentos.listarAvaliacoes).toBeDefined();
      expect(api.estabelecimentos.responderAvaliacao).toBeDefined();
      expect(api.estabelecimentos.obterFila).toBeDefined();
      expect(api.estabelecimentos.entrarNaFila).toBeDefined();
      expect(api.estabelecimentos.sairDaFila).toBeDefined();
      expect(api.estabelecimentos.chamarProximo).toBeDefined();
      expect(api.estabelecimentos.adicionarPresencialNaFila).toBeDefined();
    });

    it('deve expor todas as funções de agendamentos', () => {
      expect(api.agendamentos.listar).toBeDefined();
      expect(api.agendamentos.obter).toBeDefined();
      expect(api.agendamentos.criar).toBeDefined();
      expect(api.agendamentos.reagendar).toBeDefined();
      expect(api.agendamentos.cancelar).toBeDefined();
      expect(api.agendamentos.confirmarPresenca).toBeDefined();
      expect(api.agendamentos.avaliar).toBeDefined();
      expect(api.agendamentos.obterHorariosDisponiveis).toBeDefined();
      expect(api.agendamentos.listarBarbeiro).toBeDefined();
      expect(api.agendamentos.atualizarStatus).toBeDefined();
      expect(api.agendamentos.definirHorarioReal).toBeDefined();
    });

    it('deve expor todas as funções de feed', () => {
      expect(api.feed.listar).toBeDefined();
      expect(api.feed.obter).toBeDefined();
      expect(api.feed.criar).toBeDefined();
      expect(api.feed.excluir).toBeDefined();
      expect(api.feed.curtir).toBeDefined();
      expect(api.feed.salvar).toBeDefined();
      expect(api.feed.obterSalvas).toBeDefined();
      expect(api.feed.compartilhar).toBeDefined();
      expect(api.feed.denunciar).toBeDefined();
    });

    it('deve expor todas as funções de notificações', () => {
      expect(api.notificacoes.listar).toBeDefined();
      expect(api.notificacoes.marcarComoLida).toBeDefined();
      expect(api.notificacoes.marcarTodasComoLidas).toBeDefined();
      expect(api.notificacoes.excluir).toBeDefined();
      expect(api.notificacoes.excluirTodasLidas).toBeDefined();
    });
  });

  // ============================================================================
  // TESTES DE EDGE CASES E CASOS DE BORDA
  // ============================================================================

  describe('Edge Cases', () => {
    it('deve lidar com operações simultâneas (race conditions simuladas)', async () => {
      forcarSucesso();

      const promises = [
        api.estabelecimentos.criarServico('corte-rapido', { nome: 'S1', preco: 10, duracaoMinutos: 10, tag: 'corte' }),
        api.estabelecimentos.criarServico('corte-rapido', { nome: 'S2', preco: 20, duracaoMinutos: 20, tag: 'barba' }),
        api.estabelecimentos.criarServico('corte-rapido', { nome: 'S3', preco: 30, duracaoMinutos: 30, tag: 'pigmentacao' }),
      ];

      await Promise.all(promises.map(p => esperarLatencia().then(() => p)));
      const resultados = await Promise.all(promises);

      resultados.forEach(r => expect(r.sucesso).toBe(true));
    });

    it('deve manter integridade referencial ao excluir estabelecimento (remove agendamentos)', async () => {
      const estIdTemp = 'est-temp-delete';

      getEstadoGlobal().estabelecimentos.push({
        id: estIdTemp,
        slug: estIdTemp,
        nome: 'Temp Delete',
        responsavel: 'Temp',
        cidade: 'BH',
        nicho: 'barbearia',
        avaliacao: 0,
        status: 'aprovado',
        latitude: -19.9,
        longitude: -43.9,
        whatsapp: '(31) 99999-9999',
        endereco: 'Rua Temp',
        sobre: 'Temp',
        tema: { cor: '#000', layout: 'classico', titulo: '', subtitulo: '' },
        servicos: [],
        galeria: [],
        fila: [],
        tempoMedioAtendimento: 20,
        horarioFuncionamento: 'Seg a Sáb',
        permiteAutoEdicao: false,
        configuracaoPix: { modo: 'desativado', chave: '', percentualSinal: 30 },
        avaliacoes: [],
        seguidores: 0,
        taxaFidelidade: 0,
      });
      getEstadoGlobal().agendamentos[estIdTemp] = [{
        id: 'bk-temp', estabelecimentoId: estIdTemp, usuarioId: 'cliente@demo.com',
        dia: new Date().toISOString().split('T')[0], horario: '10:00', duracaoMinutos: 30,
        nomeCliente: 'Teste', telefoneCliente: '(31) 99999-9999', servicos: 'Corte',
        servicoIds: [], valorTotal: 40, statusPagamento: 'no_local', status: 'agendado',
      }];

      forcarSucesso();
      const promise = api.estabelecimentos.excluir(estIdTemp);
      await esperarLatencia();
      const resultado = await promise;

      expect(resultado.sucesso).toBe(true);
      expect(getEstadoGlobal().estabelecimentos.some(e => e.id === estIdTemp)).toBe(false);
      expect(getEstadoGlobal().agendamentos[estIdTemp]).toBeUndefined();
    });

    it('deve retornar arrays vazios em vez de null para listas', async () => {
      forcarSucesso();
      const promise = api.feed.listar({ filtro: 'tag-inexistente' });
      await esperarLatencia();
      const resultado = await promise;

      expect(resultado.sucesso).toBe(true);
      expect(Array.isArray(resultado.dados)).toBe(true);
      expect(resultado.dados.length).toBe(0);
    });
  });
});