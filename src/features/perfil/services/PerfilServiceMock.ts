/**
 * Implementação Mock do IPerfilService.
 */

import { IPerfilService } from './IPerfilService';
import type { Usuario, ResultadoServico } from '@/tipos';
import { simularLatencia, simularErroAleatorio, sucesso, falha } from '@/servicos/api';

export class PerfilServiceMock implements IPerfilService {
  async obter(): Promise<ResultadoServico<Usuario | null>> {
    await simularLatencia();
    simularErroAleatorio();
    // Em produção, buscaria do contexto de auth
    return sucesso(null);
  }

  async atualizar(_dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    await simularLatencia();
    simularErroAleatorio();
    // Simplificado - em produção atualizaria o usuário logado
    return falha('Não implementado no mock isolado');
  }

  async alterarSenha(_senhaAtual: string, _novaSenha: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(undefined);
  }

  async excluirConta(): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso(undefined);
  }
}