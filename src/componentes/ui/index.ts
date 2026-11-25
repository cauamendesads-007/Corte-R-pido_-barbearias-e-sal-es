/**
 * UI Components - Exportações centralizadas
 * Botao, CampoTexto, Modal, Cartao, Chip, Avatar, Toast, Skeleton,
 * Textarea, Select, Checkbox, Radio, Icone, EmptyState, ErrorState
 */

export { Icone, IconeGrupo, type NomeIcone, type IconeProps } from './Icone';
export { usarIconeBruto } from './Icone.utils';
export { Botao, BotaoIcone, BotaoPrimario, BotaoSecundario, BotaoPerigo, BotaoFantasma } from './Botao';
export { CampoTexto, CampoSenha, CampoBusca, CampoWhatsapp, CampoNumero } from './CampoTexto';
export { Modal, ModalConfirmacao, ModalFormulario } from './Modal';
export { Cartao, CartaoCabecalho, CartaoMidia, CartaoCorpo, CartaoRodape, CartaoBadge,
  CartaoEstabelecimento, CartaoPublicacao, CartaoServico, CartaoAgendamento } from './Cartao';
export { Chip, ChipGrupo } from './Chip';
export { CHIP_NICHOS, CHIP_STATUS_AGENDAMENTO } from './Chip.constantes';
export { Avatar, AvatarGrupo, AvatarNotificacao } from './Avatar';
export { ToastContainer, ToastProvider } from './Toast';
export { useToast, useGlobalToast } from './Toast.hooks';
export { ToastContext } from './Toast.context';
export { Skeleton, SkeletonTexto, SkeletonAvatar, SkeletonBotao, SkeletonInput, SkeletonGrid } from './Skeleton';
export { Textarea } from './Textarea';
export { Select } from './Select';
export { Checkbox, CheckboxGrupo, CheckboxToggle } from './Checkbox';
export { Radio, RadioGrupo, RadioCard, RadioCardGrupo } from './Radio';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { ChipStatus } from './Chip';

export type {
  PropsBotao,
  PropsCampoTexto,
  PropsModal,
  PropsCartaoEstabelecimento,
  PropsToast,
  PropsSkeleton,
} from '@/tipos';