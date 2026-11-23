/**
 * Interface de contrato para serviço de perfil (DIP).
 */

import type { Usuario, ResultadoServico } from '@/tipos';

export interface IPerfilService {
  obter(): Promise<ResultadoServico<Usuario | null>>;
  atualizar(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>>;
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>>;
  excluirConta(): Promise<ResultadoServico<void>>;
}