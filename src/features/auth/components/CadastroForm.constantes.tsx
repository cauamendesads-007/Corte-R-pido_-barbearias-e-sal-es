/**
 * Constantes do formulário de cadastro.
 * Separado para evitar re-renders e manter componentes puros.
 */

/** Opções de nicho para Select (sem ícones) */
export const NICHOS_SELECT = [
  { valor: 'barbearia', rotulo: 'Barbearia' },
  { valor: 'feminino', rotulo: 'Salão Feminino' },
  { valor: 'visagismo', rotulo: 'Visagismo' },
  { valor: 'infantil', rotulo: 'Infantil' },
] as const;

/** Opções de nicho para ChipGrupo (com ícones) */
export const NICHOS_CHIP = [
  { valor: 'barbearia', rotulo: 'Barbearia', icone: 'tesoura' },
  { valor: 'feminino', rotulo: 'Salão Feminino', icone: 'usuario' },
  { valor: 'visagismo', rotulo: 'Visagismo', icone: 'estrela' },
  { valor: 'infantil', rotulo: 'Infantil', icone: 'casa' },
] as const;

/** Tipo inferido das opções de nicho */
export type NichoOpcao = typeof NICHOS_SELECT[number];

/** Valores válidos de nicho */
export const NICHOS_VALORES = NICHOS_SELECT.map((n) => n.valor) as readonly string[];

/** Mapeamento de nicho para label */
export const NICHO_LABELS: Record<string, string> = {
  barbearia: 'Barbearia',
  feminino: 'Salão Feminino',
  visagismo: 'Visagismo',
  infantil: 'Infantil',
} as const;