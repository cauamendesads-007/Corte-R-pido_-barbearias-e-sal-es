/**
 * Tipos para o Onboarding Guiado do Estabelecimento.
 * Wizard multi-etapas para configuração inicial completa.
 */

import type { Servico, NichoEstabelecimento, TipoLayout, ConfiguracaoPix } from '@/tipos';

export type EtapaOnboarding =
  | 'boas-vindas'
  | 'dados-basicos'
  | 'localizacao-contato'
  | 'servicos-precos'
  | 'tema-aparencia'
  | 'pagamentos-pix'
  | 'confirmacao';

export interface DadosOnboarding {
  // Etapa 1: Dados Básicos
  nome: string;
  responsavel: string;
  nicho: NichoEstabelecimento;
  sobre: string;

  // Etapa 2: Localização e Contato
  endereco: string;
  cidade: string;
  cep: string;
  whatsapp: string;
  latitude?: number;
  longitude?: number;
  horarioFuncionamento: string;

  // Etapa 3: Serviços e Preços
  servicos: Omit<Servico, 'id'>[];

  // Etapa 4: Tema e Aparência
  tema: {
    cor: string;
    layout: TipoLayout;
    titulo: string;
    subtitulo: string;
  };

  // Etapa 5: Pagamentos Pix
  configuracaoPix: ConfiguracaoPix;

  // Metadados
  etapaAtual: EtapaOnboarding;
  concluido: boolean;
  estabelecimentoId?: string;
}

export interface OnboardingState {
  dados: DadosOnboarding;
  etapaAtual: EtapaOnboarding;
  erros: Record<string, string>;
  carregando: boolean;
  concluido: boolean;
}

export interface OnboardingActions {
  avancar: () => void;
  voltar: () => void;
  irParaEtapa: (etapa: EtapaOnboarding) => void;
  atualizarDados: (dados: Partial<DadosOnboarding>) => void;
  validarEtapaAtual: () => boolean;
  concluir: () => void;
  resetar: () => void;
}

export type OnboardingContextType = OnboardingState & OnboardingActions;

export const ETAPAS_ORDEM: EtapaOnboarding[] = [
  'boas-vindas',
  'dados-basicos',
  'localizacao-contato',
  'servicos-precos',
  'tema-aparencia',
  'pagamentos-pix',
  'confirmacao',
];

export const TITULOS_ETAPAS: Record<EtapaOnboarding, string> = {
  'boas-vindas': 'Bem-vindo ao Corte Rápido',
  'dados-basicos': 'Dados Básicos',
  'localizacao-contato': 'Localização e Contato',
  'servicos-precos': 'Serviços e Preços',
  'tema-aparencia': 'Tema e Aparência',
  'pagamentos-pix': 'Pagamentos Pix',
  'confirmacao': 'Confirmação',
};

export const DESCRICOES_ETAPAS: Record<EtapaOnboarding, string> = {
  'boas-vindas': 'Configure seu estabelecimento em poucos passos',
  'dados-basicos': 'Nome, responsável, nicho e descrição',
  'localizacao-contato': 'Endereço, WhatsApp e horário de funcionamento',
  'servicos-precos': 'Cadastre seus serviços, preços e durações',
  'tema-aparencia': 'Personalize cores, layout e identidade visual',
  'pagamentos-pix': 'Configure recebimento via Pix (opcional)',
  'confirmacao': 'Revise e finalize o cadastro',
};

export const CORES_TEMA = [
  '#3b82f6', // azul
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#f59e0b', // âmbar
  '#10b981', // esmeralda
  '#ef4444', // vermelho
  '#6366f1', // índigo
  '#14b8a6', // teal
];

export const LAYOUTS_DISPONIVEIS: { valor: TipoLayout; label: string; descricao: string }[] = [
  { valor: 'classico', label: 'Clássico', descricao: 'Layout tradicional com sidebar' },
  { valor: 'moderno', label: 'Moderno', descricao: 'Layout em cards responsivo' },
];

export const NICHOS_OPCOES: { valor: NichoEstabelecimento; label: string; icone: string }[] = [
  { valor: 'barbearia', label: 'Barbearia', icone: '✂️' },
  { valor: 'feminino', label: 'Salão Feminino', icone: '💇‍♀️' },
  { valor: 'visagismo', label: 'Visagismo', icone: '🎨' },
  { valor: 'infantil', label: 'Infantil', icone: '🧸' },
];

export const DADOS_INICIAIS: DadosOnboarding = {
  nome: '',
  responsavel: '',
  nicho: 'barbearia',
  sobre: '',
  endereco: '',
  cidade: '',
  cep: '',
  whatsapp: '',
  horarioFuncionamento: '09:00-18:00',
  servicos: [],
  tema: {
    cor: '#3b82f6',
    layout: 'classico',
    titulo: '',
    subtitulo: '',
  },
  configuracaoPix: {
    modo: 'desativado',
    chave: '',
    percentualSinal: 30,
  },
  etapaAtual: 'boas-vindas',
  concluido: false,
};