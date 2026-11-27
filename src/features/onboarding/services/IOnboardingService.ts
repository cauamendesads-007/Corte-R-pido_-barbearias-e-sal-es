/**
 * Interface de contrato para serviço de Onboarding (DIP).
 */

import type { ResultadoServico, Estabelecimento } from '@/tipos';
import type { DadosOnboarding } from '../types';

export interface IOnboardingService {
  /**
   * Salva progresso do onboarding no armazenamento local
   */
  salvarProgresso(dados: DadosOnboarding): Promise<ResultadoServico<void>>;

  /**
   * Recupera progresso salvo do onboarding
   */
  obterProgresso(): Promise<ResultadoServico<DadosOnboarding | null>>;

  /**
   * Limpa progresso do onboarding (após conclusão ou cancelamento)
   */
  limparProgresso(): Promise<ResultadoServico<void>>;

  /**
   * Finaliza onboarding criando o estabelecimento
   */
  finalizarOnboarding(dados: DadosOnboarding): Promise<ResultadoServico<Estabelecimento>>;

  /**
   * Verifica se onboarding já foi concluído anteriormente
   */
  verificarConcluido(): Promise<ResultadoServico<boolean>>;
}