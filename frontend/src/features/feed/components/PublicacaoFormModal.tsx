/**
 * Componente PublicacaoFormModal - Modal para criar/editar publicação.
 * Puro, coeso, < 150 linhas, validação reward early/punish late.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  Select,
  Textarea,
  ToastProvider,
  useGlobalToast,
} from '@/componentes';
import type { Publicacao, PublicacaoInput, PublicacaoTipo } from '../types';
import { validarPublicacao, sanitizarConteudo } from '../rules';
import './PublicacaoFormModal.css';

interface PublicacaoFormModalProps {
  /** Modal aberto */
  aberto: boolean;
  /** Callback ao fechar */
  aoFechar: () => void;
  /** Publicação para editar (undefined = nova) */
  publicacao?: Publicacao;
  /** Callback ao salvar */
  aoSalvar: (input: PublicacaoInput) => Promise<void>;
  /** Carregando */
  salvando?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const TIPOS: { valor: PublicacaoTipo; rotulo: string; icone: string }[] = [
  { valor: 'corte', rotulo: 'Corte', icone: 'tesoura' },
  { valor: 'barba', rotulo: 'Barba', icone: 'tesoura' },
  { valor: 'combo', rotulo: 'Combo', icone: 'grade' },
  { valor: 'inspiracao', rotulo: 'Inspiração', icone: 'estrela' },
  { valor: 'dica', rotulo: 'Dica', icone: 'info' },
  { valor: 'outro', rotulo: 'Outro', icone: 'foto' },
];

export const PublicacaoFormModal = ({
  aberto,
  aoFechar,
  publicacao,
  aoSalvar,
  salvando = false,
  className = '',
  'data-testid': testId,
}: PublicacaoFormModalProps) => {
  const { erro: toastErro, sucesso } = useGlobalToast();
  const [form, setForm] = useState<PublicacaoInput>({
    conteudo: '',
    tipo: 'corte',
    midias: [],
  });
  const [erros, setErros] = useState<Partial<Record<keyof PublicacaoInput, string>>>({});
  const [tocou, setTocou] = useState<Partial<Record<keyof PublicacaoInput, boolean>>>({});

  // Inicializa com dados da publicação se editando
  useEffect(() => {
    if (publicacao) {
      setForm({
        conteudo: publicacao.conteudo,
        tipo: publicacao.tipo,
        midias: publicacao.midias?.map((m) => ({ src: m.src, tipo: m.tipo, alt: m.alt, thumbnail: m.thumbnail })) || [],
      });
      setErros({});
      setTocou({});
    } else {
      setForm({ conteudo: '', tipo: 'corte', midias: [] });
      setErros({});
      setTocou({});
    }
  }, [publicacao]);

  const handleChange = useCallback((campo: keyof PublicacaoInput, valor: any) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    // Validação "reward early" - limpa erro ao digitar
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
    setTocou((prev) => ({ ...prev, [campo]: true }));
  }, [erros]);

  const handleMidiasChange = useCallback((midias: PublicacaoInput['midias']) => {
    handleChange('midias', midias);
  }, [handleChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Marca todos como tocados
    setTocou({ conteudo: true, tipo: true, midias: true });

    // Valida tudo
    const erro = validarPublicacao(form);
    if (erro) {
      // Tenta identificar qual campo
      if (erro.includes('Conteúdo')) setErros((p) => ({ ...p, conteudo: erro }));
      else if (erro.includes('Tipo')) setErros((p) => ({ ...p, tipo: erro }));
      else if (erro.includes('mídia') || erro.includes('Mídia')) setErros((p) => ({ ...p, midias: erro }));
      return;
    }

    try {
      await aoSalvar({ ...form, conteudo: sanitizarConteudo(form.conteudo) });
      sucesso(publicacao ? 'Publicação atualizada!' : 'Publicação criada!');
      aoFechar();
    } catch {
      toastErro('Erro ao salvar publicação');
    }
  }, [form, publicacao, aoSalvar, aoFechar, sucesso, toastErro]);

  const isEditando = !!publicacao;

  return (
    <ToastProvider>
      <Modal
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={isEditando ? 'Editar publicação' : 'Nova publicação'}
        tamanho="grande"
        data-testid={testId}
      >
        <form onSubmit={handleSubmit} className={`publicacao-form-modal ${className}`}>
          {/* Conteúdo */}
          <div className="publicacao-form-modal__campo">
            <label className="publicacao-form-modal__label">
              O que você quer compartilhar? <span className="publicacao-form-modal__obrigatorio">*</span>
            </label>
            <Textarea
              label=""
              valor={form.conteudo}
              aoAlterar={(v) => handleChange('conteudo', v)}
              placeholder={isEditando ? 'Edite sua publicação...' : 'Conte sobre seu corte, dica, inspiração...'}
              linhas={5}
              maxLength={2000}
              mostrarContador
              erro={tocou.conteudo ? erros.conteudo : undefined}
              data-testid="publicacao-conteudo"
            />
            {tocou.conteudo && !erros.conteudo && form.conteudo.trim() && (
              <span className="publicacao-form-modal__sucesso">
                <Icone nome="verificar" tamanho={14} /> Conteúdo válido
              </span>
            )}
          </div>

          {/* Tipo */}
          <div className="publicacao-form-modal__campo">
            <label className="publicacao-form-modal__label">
              Tipo <span className="publicacao-form-modal__obrigatorio">*</span>
            </label>
            <Select
              label=""
              valor={form.tipo}
              aoAlterar={(v) => handleChange('tipo', v)}
              opcoes={TIPOS.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
              placeholder="Selecione o tipo"
              erro={tocou.tipo ? erros.tipo : undefined}
              data-testid="publicacao-tipo"
            />
          </div>

          {/* Mídias */}
          <div className="publicacao-form-modal__campo">
            <label className="publicacao-form-modal__label">
              Fotos/Vídeos (máx. 10) {form.tipo === 'inspiracao' && <span className="publicacao-form-modal__obrigatorio">*</span>}
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 10);
                const novasMidias = files.map((file) => ({
                  src: URL.createObjectURL(file),
                  tipo: file.type.startsWith('video/') ? 'video' as const : 'imagem' as const,
                }));
                handleMidiasChange(novasMidias);
              }}
              className="publicacao-form-modal__file-input"
              data-testid="publicacao-midias"
            />
            {tocou.midias && erros.midias && (
              <span className="publicacao-form-modal__erro">{erros.midias}</span>
            )}
            <div className="publicacao-form-modal__midias-preview">
              {form.midias.map((midia, index) => (
                <div key={index} className="publicacao-form-modal__midia-item">
                  {midia.tipo === 'video' ? (
                    <video src={midia.src} controls muted className="publicacao-form-modal__video" />
                  ) : (
                    <img src={midia.src} alt="" className="publicacao-form-modal__imagem" />
                  )}
                  <span className="publicacao-form-modal__midia-tipo">
                    <Icone nome={midia.tipo === 'video' ? 'video' : 'foto'} tamanho={12} />
                    {midia.tipo === 'video' ? 'Vídeo' : 'Imagem'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="publicacao-form-modal__acoes">
            <BotaoSecundario
              tipo="button"
              aoClicar={aoFechar}
              desabilitado={salvando}
              data-testid="publicacao-form-cancelar"
            >
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario
              tipo="submit"
              iconeEsquerda={<Icone nome={isEditando ? 'salvar' : 'setaDireita'} tamanho={16} />}
              carregando={salvando}
              desabilitado={!form.conteudo.trim() || salvando}
              data-testid="publicacao-form-salvar"
            >
              {isEditando ? 'Salvar alterações' : 'Publicar'}
            </BotaoPrimario>
          </div>
        </form>      </Modal>
    </ToastProvider>
  );
};

export default PublicacaoFormModal;