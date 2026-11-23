/**
 * Interface de contrato para serviço de estabelecimentos (DIP).
 */

import type { Estabelecimento, Servico, ItemGaleria, Avaliacao, ConfiguracaoPix, MensagemAutomatica, FiltrosBusca, ResultadoServico } from '@/tipos';

export interface IEstabelecimentosService {
  // Busca e listagem
  buscar(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>>;
  obter(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  obterPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>>;

  // CRUD Estabelecimento
  criar(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>>;
  atualizar(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>>;
  excluir(id: string): Promise<ResultadoServico<void>>;

  // Configurações
  atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>>;
  atualizarMensagensAutomaticas(id: string, mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>>;
  atualizarTema(id: string, tema: { cor?: string; layout?: string; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>>;
  atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>>;
  definirAutoEdicao(id: string, permitido: boolean): Promise<ResultadoServico<void>>;

  // Serviços
  listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>>;
  obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>>;
  criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>>;
  atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>>;
  excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>>;
  reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>>;
  adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>>;
  removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>>;

  // Galeria
  listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>>;
  adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>>;
  removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>>;
  reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>>;
  adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>>;
  removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>>;

  // Avaliações
  listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>>;
  responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>>;

  // Fila
  obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>>;
  entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>>;
  sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>>;
  chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>>;
  adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>>;
  removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>>;
}