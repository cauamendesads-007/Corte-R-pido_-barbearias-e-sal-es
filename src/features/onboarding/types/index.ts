/**
 * Tipos do domínio Onboarding.
 * Fluxo multi-etapas com persistência em sessionStorage.
 */

import type { UsuarioRole } from '@/tipos';

/** Etapas do onboarding */
export type OnboardingEtapa =
  | 'boas-vindas'
  | 'tipo-usuario'
  | 'dados-pessoais'
  | 'endereco'
  | 'preferencias'
  | 'conclusao';

/** Ordem das etapas */
export const ORDEM_ETAPAS: OnboardingEtapa[] = [
  'boas-vindas',
  'tipo-usuario',
  'dados-pessoais',
  'endereco',
  'preferencias',
  'conclusao',
];

/** Dados do rascunho do onboarding (persistido em sessionStorage) */
export interface OnboardingRascunho {
  etapaAtual: OnboardingEtapa;
  dados: Partial<OnboardingDados>;
  atualizadoEm: string;
  versao: number;
}

/** Dados completos do onboarding */
export interface OnboardingDados {
  // Tipo de usuário
  tipoUsuario: 'cliente' | 'barbeiro';

  // Dados pessoais
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  dataNascimento?: string;
  genero?: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_dizer';
  cpf?: string;

  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;

  // Preferências
  notificacoesPush: boolean;
  notificacoesEmail: boolean;
  notificacoesSms: boolean;
  tema: 'claro' | 'escuro' | 'sistema';
}

/** Props para cada etapa */
export interface EtapaBoasVindasProps {
  aoContinuar: () => void;
  carregando?: boolean;
}

export interface EtapaTipoUsuarioProps {
  tipoSelecionado: 'cliente' | 'barbeiro' | null;
  aoSelecionar: (tipo: 'cliente' | 'barbeiro') => void;
  aoAvancar: () => void;
  aoVoltar: () => void;
  carregando?: boolean;
}

export interface EtapaDadosPessoaisProps {
  dados: Partial<OnboardingDados>;
  aoAlterar: (campo: keyof OnboardingDados, valor: string) => void;
  aoAvancar: () => void;
  aoVoltar: () => void;
  erros: Partial<Record<keyof OnboardingDados, string>>;
  touched: Record<string, boolean>;
  aoBlur: (campo: string) => void;
  carregando?: boolean;
}

export interface EtapaEnderecoProps {
  dados: Partial<OnboardingDados>;
  aoAlterar: (campo: keyof OnboardingDados, valor: string) => void;
  aoAvancar: () => void;
  aoVoltar: () => void;
  erros: Partial<Record<keyof OnboardingDados, string>>;
  touched: Record<string, boolean>;
  aoBlur: (campo: string) => void;
  carregando?: boolean;
}

export interface EtapaPreferenciasProps {
  dados: Partial<OnboardingDados>;
  aoAlterar: (campo: keyof OnboardingDados, valor: string | boolean) => void;
  aoAvancar: () => void;
  aoVoltar: () => void;
  aoConcluir: () => void;
  carregando?: boolean;
}

export interface EtapaConclusaoProps {
  aoEntrar: () => void;
  carregando?: boolean;
}

/** Estado do hook useOnboarding */
export interface OnboardingState {
  etapaAtual: OnboardingEtapa;
  dados: Partial<OnboardingDados>;
  erros: Partial<Record<keyof OnboardingDados, string>>;
  touched: Record<string, boolean>;
  carregando: boolean;
  erro: string | null;
  concluido: boolean;
  rascunhoExiste: boolean;
}

/** Actions do hook useOnboarding */
export interface OnboardingActions {
  avancar: () => void;
  voltar: () => void;
  irParaEtapa: (etapa: OnboardingEtapa) => void;
  atualizarDado: <K extends keyof OnboardingDados>(campo: K, valor: OnboardingDados[K]) => void;
  validarEtapaAtual: () => boolean;
  marcarTouched: (campo: string) => void;
  salvarRascunho: () => void;
  carregarRascunho: () => boolean;
  limparRascunho: () => void;
  concluir: () => Promise<void>;
  limparErro: () => void;
}

/** Tipo combinado para o hook */
export type OnboardingHook = OnboardingState & OnboardingActions;

/** Resultado padronizado */
export interface OnboardingResult<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigo?: string;
}

/** Configurações de validação */
export interface ValidacaoOnboardingConfig {
  nomeMin: number;
  nomeMax: number;
  senhaMin: number;
  telefoneObrigatorio: boolean;
  cpfObrigatorio: boolean;
  enderecoObrigatorio: boolean;
}