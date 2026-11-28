/**
 * Testes unitários para SupabaseEstabelecimentosService
 * Mocka o SDK @supabase/supabase-js
 * Cobertura: sucesso, conflito, RLS (403), fallback mock
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Estabelecimento, Servico, ItemGaleria, Avaliacao, ConfiguracaoPix, FiltrosBusca, NichoEstabelecimento, TipoLayout } from '@/tipos';

// Mock do cliente Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    admin: {
      deleteUser: vi.fn(),
    },
  },
  functions: {
    invoke: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
  channel: vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() })),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
};

// Mock do módulo client
vi.mock('../client', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isMockMode: vi.fn(() => false),
  initSupabase: vi.fn(),
  enableMockMode: vi.fn(),
  resetSupabase: vi.fn(),
}));

// Import service after mocks are set up
const { SupabaseEstabelecimentosService } = await import('../SupabaseEstabelecimentosService');
let service = SupabaseEstabelecimentosService;

describe('SupabaseEstabelecimentosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.rpc.mockReset();
    mockSupabase.auth.getUser.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const mockEstabelecimentoRow = {
    id: 'est-123',
    slug: 'minha-barbearia',
    nome: 'Minha Barbearia',
    responsavel: 'João Silva',
    cidade: 'São Paulo',
    nicho: 'barbearia',
    avaliacao: 4.8,
    status: 'aprovado',
    latitude: -23.55,
    longitude: -46.63,
    whatsapp: '(11) 99999-9999',
    endereco: 'Rua Teste, 123',
    sobre: 'Sobre a barbearia',
    tema_cor: '#B45309',
    tema_layout: 'classico',
    tema_titulo: 'Minha Barbearia',
    tema_subtitulo: 'A melhor barbearia',
    tempo_medio_atendimento: 20,
    horario_funcionamento: 'Seg a Sáb, 9h às 18h',
    permite_auto_edicao: false,
    configuracao_pix_modo: 'opcional',
    configuracao_pix_chave: 'chave@pix.com',
    configuracao_pix_percentual_sinal: 30,
    seguidores: 10,
    taxa_fidelidade: 0,
    servicos: [
      {
        id: 'serv-1',
        nome: 'Corte',
        preco_centavos: 5000,
        duracao_min: 30,
        tag: 'corte',
        servico_midias: [],
      },
    ],
    galeria: [
      { id: 'gal-1', src: 'https://exemplo.com/foto1.jpg', tipo: 'imagem', ordem: 1 },
    ],
    avaliacoes: [
      { id: 'av-1', nome_cliente: 'Cliente 1', estrelas: 5, comentario: 'Ótimo!', data_criacao: '2025-01-01', resposta: null },
    ],
    fila: [],
  };

  const mockServicoRow = {
    id: 'serv-1',
    estabelecimento_id: 'est-123',
    nome: 'Corte',
    descricao: 'Corte tradicional',
    preco_centavos: 5000,
    duracao_min: 30,
    tag: 'corte',
    ativo: true,
    ordem_exibicao: 1,
    servico_midias: [],
  };

  const mockGaleriaRow = {
    id: 'gal-1',
    estabelecimento_id: 'est-123',
    src: 'https://exemplo.com/foto1.jpg',
    tipo: 'imagem',
    ordem: 1,
  };

  function createChain(returnData: any) {
    const chain = {
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      in: vi.fn(() => chain),
      select: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
      then: vi.fn((resolve) => resolve({ data: returnData, error: null })),
    };
    return chain;
  }

  function setupSelectEstabelecimentos(returnData: any = [mockEstabelecimentoRow]) {
    const chain = createChain(returnData);
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'v_estabelecimentos_publicos') {
        return { select: vi.fn(() => chain) };
      }
      if (table === 'servicos') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) })) })) };
      }
      if (table === 'agendamentos') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ in: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })) })) })) };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
    });
  }

  function setupSelectSingle(returnData: any = mockEstabelecimentoRow) {
    const chain = createChain(returnData);
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'estabelecimentos') {
        return { select: vi.fn(() => chain) };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
    });
  }

  // ============================================================================
  // TESTES: listarEstabelecimentos (marketplace público)
  // ============================================================================

  describe('listarEstabelecimentos (público)', () => {
    it('deve listar estabelecimentos aprovados com filtros', async () => {
      setupSelectEstabelecimentos([mockEstabelecimentoRow]);

      const filtros: FiltrosBusca = {
        nicho: 'barbearia',
        precoMaximo: 100,
        avaliacaoMinima: 4.5,
        tipoServico: '',
        ordenacao: 'avaliacao',
        apenasBemAvaliados: false,
        apenasVagasHoje: false,
        localizacaoUsuario: null,
      };

      const resultado = await service.listarEstabelecimentos(filtros);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados?.[0].id).toBe('est-123');
      expect(resultado.dados?.[0].servicos).toHaveLength(1);
      expect(resultado.dados?.[0].servicos[0].preco).toBe(50);
    });

    it('deve filtrar por nicho', async () => {
      setupSelectEstabelecimentos([]);

      const filtros: FiltrosBusca = {
        nicho: 'feminino',
        precoMaximo: 0,
        avaliacaoMinima: 0,
        tipoServico: '',
        ordenacao: 'avaliacao',
        apenasBemAvaliados: false,
        apenasVagasHoje: false,
        localizacaoUsuario: null,
      };

      const resultado = await service.listarEstabelecimentos(filtros);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toEqual([]);
    });

    it('deve ordenar por avaliação decrescente', async () => {
      const chain = createChain([mockEstabelecimentoRow]);
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'v_estabelecimentos_publicos') {
          return { select: vi.fn(() => chain) };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const filtros: FiltrosBusca = {
        nicho: 'todos',
        precoMaximo: 0,
        avaliacaoMinima: 0,
        tipoServico: '',
        ordenacao: 'avaliacao',
        apenasBemAvaliados: false,
        apenasVagasHoje: false,
        localizacaoUsuario: null,
      };

      await service.listarEstabelecimentos(filtros);
      expect(chain.order).toHaveBeenCalledWith('avaliacao', { ascending: false });
    });

    it('deve retornar erro quando Supabase falha', async () => {
      const chain = createChain(null);
      chain.select.mockResolvedValue({ data: null, error: { message: 'Erro ao buscar estabelecimentos.' } });
      chain.then.mockImplementation((resolve) => resolve({ data: null, error: { message: 'Erro ao buscar estabelecimentos.' } }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'v_estabelecimentos_publicos') {
          return { select: vi.fn(() => chain) };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const filtros: FiltrosBusca = {
        nicho: 'todos',
        precoMaximo: 0,
        avaliacaoMinima: 0,
        tipoServico: '',
        ordenacao: 'avaliacao',
        apenasBemAvaliados: false,
        apenasVagasHoje: false,
        localizacaoUsuario: null,
      };

      const resultado = await service.listarEstabelecimentos(filtros);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao buscar estabelecimentos.');
    });
  });

  // ============================================================================
  // TESTES: buscarEstabelecimentoPorSlug
  // ============================================================================

  describe('buscarEstabelecimentoPorSlug', () => {
    it('deve buscar estabelecimento por slug com dados completos', async () => {
      const estChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockEstabelecimentoRow, error: null }),
          })),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'v_estabelecimentos_publicos') return { select: vi.fn(() => estChain) };
        if (table === 'servicos') return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [mockServicoRow], error: null }) })) })) })) };
        if (table === 'galeria') return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [mockGaleriaRow], error: null }) })) })) };
        if (table === 'avaliacoes') return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockEstabelecimentoRow.avaliacoes, error: null }) })) })) };
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.buscarEstabelecimentoPorSlug('minha-barbearia');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).not.toBeNull();
      expect(resultado.dados?.slug).toBe('minha-barbearia');
      expect(resultado.dados?.servicos).toHaveLength(1);
      expect(resultado.dados?.galeria).toHaveLength(1);
      expect(resultado.dados?.avaliacoes).toHaveLength(1);
    });

    it('deve retornar null quando slug não encontrado', async () => {
      const estChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'v_estabelecimentos_publicos') return { select: vi.fn(() => estChain) };
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.buscarEstabelecimentoPorSlug('inexistente');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados).toBeNull();
    });
  });

  // ============================================================================
  // TESTES: buscarEstabelecimentoPorId (barbeiro/admin)
  // ============================================================================

  describe('buscarEstabelecimentoPorId', () => {
    it('deve buscar estabelecimento por ID (todos status)', async () => {
      setupSelectSingle(mockEstabelecimentoRow);

      const resultado = await service.buscarEstabelecimentoPorId('est-123');

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.id).toBe('est-123');
    });
  });

  // ============================================================================
  // TESTES: atualizarEstabelecimento (barbeiro dono)
  // ============================================================================

  describe('atualizarEstabelecimento', () => {
    it('deve atualizar estabelecimento com sucesso', async () => {
      const updatedEst = { ...mockEstabelecimentoRow, nome: 'Novo Nome', tema_cor: '#FF0000' };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: updatedEst, error: null }),
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.atualizarEstabelecimento('est-123', { nome: 'Novo Nome', tema: { cor: '#FF0000' } as any });

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.nome).toBe('Novo Nome');
    });

    it('deve retornar erro quando estabelecimento não encontrado', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.atualizarEstabelecimento('inexistente', { nome: 'Teste' });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Estabelecimento não encontrado.');
    });
  });

  // ============================================================================
  // TESTES: atualizarConfiguracaoPix
  // ============================================================================

  describe('atualizarConfiguracaoPix', () => {
    it('deve atualizar configuração Pix com sucesso', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      configuracao_pix_modo: 'obrigatorio',
                      configuracao_pix_chave: 'nova@chave.com',
                      configuracao_pix_percentual_sinal: 50,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const config: ConfiguracaoPix = {
        modo: 'obrigatorio',
        chave: 'nova@chave.com',
        percentualSinal: 50,
      };

      const resultado = await service.atualizarConfiguracaoPix('est-123', config);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.modo).toBe('obrigatorio');
      // configuracao_pix_chave é revoked para SELECT, retorna string vazia
      expect(resultado.dados?.chave).toBe('');
      expect(resultado.dados?.percentualSinal).toBe(50);
    });
  });

  // ============================================================================
  // TESTES: SERVIÇOS
  // ============================================================================

  describe('Serviços', () => {
    describe('listarServicos', () => {
      it('deve listar serviços ativos do estabelecimento', async () => {
        const chain = {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [mockServicoRow], error: null }),
            })),
          })),
        };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'servicos') return { select: vi.fn(() => chain) };
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.listarServicos('est-123');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(1);
        expect(resultado.dados?.[0].preco).toBe(50);
      });
    });

    describe('adicionarServico', () => {
      it('deve criar serviço com sucesso', async () => {
        let selectCallCount = 0;
        const novoServicoRow = { ...mockServicoRow, nome: 'Barba', preco_centavos: 3000, duracao_min: 20, tag: 'barba' };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'servicos') {
            return {
              select: vi.fn(() => {
                selectCallCount++;
                // First call: get max ordem
                // Second call: reload after insert (after insert is called)
                if (selectCallCount === 1) {
                  return {
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn().mockResolvedValue({ data: [{ ordem_exibicao: 1 }], error: null }),
                      })),
                    })),
                  };
                } else {
                  return {
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: novoServicoRow, error: null }),
                    })),
                  };
                }
              }),
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: novoServicoRow, error: null }),
                })),
              })),
            };
          }
          if (table === 'servico_midias') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const novoServico: Omit<Servico, 'id'> = {
          nome: 'Barba',
          preco: 30,
          duracaoMinutos: 20,
          tag: 'barba',
        };

        const resultado = await service.adicionarServico('est-123', novoServico);

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.nome).toBe('Barba');
      });
    });

    describe('atualizarServico', () => {
      it('deve atualizar serviço com sucesso', async () => {
        const updatedServ = { ...mockServicoRow, nome: 'Corte Premium', preco_centavos: 8000 };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'servicos') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: updatedServ, error: null }),
                    })),
                  })),
                })),
              })),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.atualizarServico('est-123', 'serv-1', { nome: 'Corte Premium', preco: 80 });

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.nome).toBe('Corte Premium');
      });
    });

    describe('excluirServico', () => {
      it('deve excluir serviço com sucesso', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'servicos') {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                })),
              })),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.excluirServico('est-123', 'serv-1');

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES: GALERIA
  // ============================================================================

  describe('Galeria', () => {
    describe('adicionarGaleria', () => {
      it('deve adicionar item à galeria com sucesso', async () => {
        const newGaleriaRow = { ...mockGaleriaRow, src: 'https://exemplo.com/nova.jpg' };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'galeria') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn().mockResolvedValue({ data: [{ ordem: 1 }], error: null }),
                  })),
                })),
              })),
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: newGaleriaRow, error: null }),
                })),
              })),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const item: Omit<ItemGaleria, 'id'> = { src: 'https://exemplo.com/nova.jpg', tipo: 'imagem' };
        const resultado = await service.adicionarGaleria('est-123', item);

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.src).toBe('https://exemplo.com/nova.jpg');
      });
    });

    describe('removerGaleria', () => {
      it('deve remover item da galeria com sucesso', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'galeria') {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                })),
              })),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.removerGaleria('est-123', 'gal-1');

        expect(resultado.sucesso).toBe(true);
      });
    });
  });

  // ============================================================================
  // TESTES: AVALIAÇÕES
  // ============================================================================

  describe('Avaliações', () => {
    describe('listarAvaliacoes', () => {
      it('deve listar avaliações do estabelecimento', async () => {
        const chain = {
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockEstabelecimentoRow.avaliacoes, error: null }),
          })),
        };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'avaliacoes') return { select: vi.fn(() => chain) };
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.listarAvaliacoes('est-123');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados).toHaveLength(1);
        expect(resultado.dados?.[0].estrelas).toBe(5);
      });
    });

    describe('responderAvaliacao', () => {
      it('deve responder avaliação com sucesso', async () => {
        const updatedAval = { ...mockEstabelecimentoRow.avaliacoes[0], resposta: 'Obrigado!', resposta_data: '2025-01-02' };
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'avaliacoes') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: updatedAval, error: null }),
                    })),
                  })),
                })),
              })),
            };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
        });

        const resultado = await service.responderAvaliacao('est-123', 'av-1', 'Obrigado!');

        expect(resultado.sucesso).toBe(true);
        expect(resultado.dados?.resposta).toBe('Obrigado!');
      });
    });
  });

  // ============================================================================
  // TESTES: ADMIN - criarEstabelecimento
  // ============================================================================

  describe('Admin - criarEstabelecimento', () => {
    it('deve criar estabelecimento como admin com sucesso', async () => {
      let slugCall = 0;
      const adminEstabelecimentoRow = { ...mockEstabelecimentoRow, nome: 'Barbearia Admin', slug: 'barbearia-admin' };
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => {
                  slugCall++;
                  return Promise.resolve({ data: null, error: null });
                }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: adminEstabelecimentoRow, error: null }),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const dados = {
        nome: 'Barbearia Admin',
        responsavel: 'Admin User',
        cidade: 'São Paulo',
        nicho: 'barbearia' as NichoEstabelecimento,
        latitude: -23.55,
        longitude: -46.63,
        whatsapp: '(11) 99999-9999',
        endereco: 'Rua Admin, 100',
        sobre: 'Criada pelo admin',
        tema: { cor: '#B45309', layout: 'classico' as TipoLayout, titulo: 'Barbearia Admin', subtitulo: 'Admin' },
        tempoMedioAtendimento: 20,
        horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
        permiteAutoEdicao: true,
        configuracaoPix: { modo: 'opcional' as any, chave: 'admin@pix.com', percentualSinal: 30 },
      };

      const resultado = await service.criarEstabelecimento(dados);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.dados?.nome).toBe('Barbearia Admin');
    });
  });

  // ============================================================================
  // TESTES: MODO MOCK (FALLBACK)
  // ============================================================================

  describe('Modo Mock (fallback quando VITE_SUPABASE_URL não definido)', () => {
    let mockService: typeof service;

    beforeEach(async () => {
      vi.resetModules();
      vi.doMock('../client', () => ({
        getSupabase: vi.fn(() => mockSupabase),
        isMockMode: vi.fn(() => true),
        initSupabase: vi.fn(),
        enableMockMode: vi.fn(),
        resetSupabase: vi.fn(),
      }));

      const module = await import('../SupabaseEstabelecimentosService');
      mockService = module.SupabaseEstabelecimentosService;
    });

    it('deve delegar para API mock quando isMockMode() retorna true', async () => {
      const mockApi = {
        listarEstabelecimentos: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        buscarEstabelecimentoPorSlug: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        buscarEstabelecimentoPorId: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        atualizarEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true }),
        atualizarConfiguracaoPix: vi.fn().mockResolvedValue({ sucesso: true }),
        atualizarMensagensAutomaticas: vi.fn().mockResolvedValue({ sucesso: true }),
        listarServicos: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        obterServico: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        adicionarServico: vi.fn().mockResolvedValue({ sucesso: true }),
        atualizarServico: vi.fn().mockResolvedValue({ sucesso: true }),
        excluirServico: vi.fn().mockResolvedValue({ sucesso: true }),
        reordenarServicos: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        adicionarMidiaServico: vi.fn().mockResolvedValue({ sucesso: true }),
        removerMidiaServico: vi.fn().mockResolvedValue({ sucesso: true }),
        adicionarGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
        removerGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
        reordenarGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        listarGaleria: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        listarAvaliacoes: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        responderAvaliacao: vi.fn().mockResolvedValue({ sucesso: true }),
        entrarNaFila: vi.fn().mockResolvedValue({ sucesso: true, dados: { posicao: 1, esperaEstimada: 20 } }),
        obterFila: vi.fn().mockResolvedValue({ sucesso: true, dados: { fila: [], esperaEstimada: 0 } }),
        chamarProximoFila: vi.fn().mockResolvedValue({ sucesso: true }),
        removerDaFila: vi.fn().mockResolvedValue({ sucesso: true }),
        adicionarPresencialNaFila: vi.fn().mockResolvedValue({ sucesso: true }),
        sairDaFila: vi.fn().mockResolvedValue({ sucesso: true }),
        atualizarTemaEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true }),
        atualizarHorarioFuncionamento: vi.fn().mockResolvedValue({ sucesso: true }),
        definirAutoEdicao: vi.fn().mockResolvedValue({ sucesso: true }),
        criarEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true }),
        excluirEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true }),
        obterEstabelecimento: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        obterEstabelecimentoPorSlug: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        buscarEstabelecimentos: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        listarServicosWrapper: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
        obterServicoWrapper: vi.fn().mockResolvedValue({ sucesso: true, dados: null }),
        criarServico: vi.fn().mockResolvedValue({ sucesso: true }),
        adicionarMidiaGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
        removerMidiaGaleria: vi.fn().mockResolvedValue({ sucesso: true }),
        chamarProximo: vi.fn().mockResolvedValue({ sucesso: true }),
        adicionarAvaliacao: vi.fn().mockResolvedValue({ sucesso: true }),
      };

      vi.doMock('@/servicos/api', () => mockApi);

      vi.resetModules();
      const mod = await import('../SupabaseEstabelecimentosService');
      const svc = mod.SupabaseEstabelecimentosService;

      await svc.listarEstabelecimentos({ nicho: 'todos', precoMaximo: 0, avaliacaoMinima: 0, tipoServico: '', ordenacao: 'avaliacao', apenasBemAvaliados: false, apenasVagasHoje: false, localizacaoUsuario: null });
      expect(mockApi.listarEstabelecimentos).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TESTES: RLS / PERMISSÃO (HTTP 403)
  // ============================================================================

  describe('Erros de permissão RLS (HTTP 403)', () => {
    it('deve retornar erro quando RLS bloqueia atualização', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'estabelecimentos') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } }),
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.atualizarEstabelecimento('est-123', { nome: 'Teste' });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao atualizar estabelecimento.');
    });

    it('deve retornar erro quando RLS bloqueia inserção de serviço', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'servicos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied by row-level security policy', code: '42501' } }),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) };
      });

      const resultado = await service.adicionarServico('est-123', { nome: 'Teste', preco: 50, duracaoMinutos: 30, tag: 'teste' });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Erro ao criar serviço.');
    });
  });
});