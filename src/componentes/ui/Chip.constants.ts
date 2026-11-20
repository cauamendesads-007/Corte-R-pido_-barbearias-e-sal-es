/**
 * Constantes para Chip - Separadas para evitar warning de fast-refresh.
 */

import type { ChipOpcao } from './Chip';

/** Nichos disponíveis para chips de nicho */
export const CHIP_NICHOS: ChipOpcao[] = [
  { valor: 'barbearia', rotulo: 'Barbearia', icone: '✂️' },
  { valor: 'salao', rotulo: 'Salão', icone: '💇' },
  { valor: 'esmalteria', rotulo: 'Esmalteria', icone: '💅' },
  { valor: 'estetica', rotulo: 'Estética', icone: '✨' },
  { valor: 'massagem', rotulo: 'Massagem', icone: '💆' },
  { valor: 'depilacao', rotulo: 'Depilação', icone: '🪒' },
  { valor: 'barbearia_salao', rotulo: 'Barbearia + Salão', icone: '💈' },
];

/** Status de agendamento para chips de status */
export const CHIP_STATUS_AGENDAMENTO: ChipOpcao[] = [
  { valor: 'agendado', rotulo: 'Agendado' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
  { valor: 'pago', rotulo: 'Pago' },
  { valor: 'no_local', rotulo: 'No local' },
  { valor: 'aguardando_pix', rotulo: 'Aguardando PIX' },
];