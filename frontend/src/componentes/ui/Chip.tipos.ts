/**
 * Tipos para o componente Chip.
 * Separados para evitar dependências circulares e warnings de react-refresh.
 */

/** Opção de chip para grupos */
export interface ChipOpcao {
  valor: string;
  rotulo: string;
  icone?: React.ReactNode;
}

/** Status de agendamento válidos */
export type StatusAgendamento =
  | 'agendado'
  | 'confirmado'
  | 'concluido'
  | 'cancelado'
  | 'pago'
  | 'no_local'
  | 'aguardando_pix';

/** Variantes de chip disponíveis */
export type VarianteChip = 'padrao' | 'selecao' | 'filtro' | 'status' | 'nicho';