/**
 * Interface de contrato para serviço de administração (DIP).
 */

import type { Usuario, Estabelecimento, PlanoAssinatura, AssinaturaEstabelecimento, StatusEstabelecimento, ResultadoServico } from '@/tipos';

export interface IAdminService {
  // Usuários
  listarUsuarios(): Promise<ResultadoServico<Usuario[]>>;
  obterUsuario(id: string): Promise<ResultadoServico<Usuario | null>>;
  atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;
  excluirUsuario(id: string): Promise<ResultadoServico<void>>;

  // Estabelecimentos
  listarEstabelecimentos(): Promise<ResultadoServico<Estabelecimento[]>>;
  obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>>;
  aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>>;
  alterarStatusEstabelecimento(id: string, status: StatusEstabelecimento): Promise<ResultadoServico<void>>;

  // Planos
  listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>>;
  obterPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>>;
  criarPlano(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>>;
  atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>>;
  excluirPlano(planoId: string): Promise<ResultadoServico<void>>;

  // Assinaturas
  listarAssinaturas(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>>;
  listarPagamentos(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>>;
}