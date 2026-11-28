/**
 * Componente PerfilForm - Formulário de edição de perfil com validação reward early/punish late.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Input,
  Textarea,
  Select,
  Alerta,
  ForcaSenha,
  Modal,
  Skeleton,
} from '@/componentes';
import type { Perfil, AtualizarPerfilDados, AlterarSenhaDados } from '../types';
import {
  validarAtualizarPerfil,
  validarAlterarSenha,
  validarCPF,
  validarTelefone,
  formatarCPF,
  formatarTelefone,
  calcularForcaSenha,
  sanitizarPerfil,
} from '../rules';
import './PerfilForm.css';

interface PerfilFormProps {
  /** Perfil atual */
  perfil: Perfil | null;
  /** Callback ao salvar */
  aoSalvar: (dados: AtualizarPerfilDados) => Promise<void>;
  /** Callback ao alterar senha */
  aoAlterarSenha?: (dados: AlterarSenhaDados) => Promise<void>;
  /** Carregando */
  carregando?: boolean;
  /** Aberto */
  aberto: boolean;
  /** Callback ao fechar */
  aoFechar: () => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const PerfilForm = ({
  perfil,
  aoSalvar,
  aoAlterarSenha,
  carregando = false,
  aberto,
  aoFechar,
  className = '',
  'data-testid': testId,
}: PerfilFormProps) => {
  const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'senha'>('perfil');
  const [dados, setDados] = useState<AtualizarPerfilDados>({});
  const [senhaDados, setSenhaDados] = useState<AlterarSenhaDados>({
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });
  const [erros, setErros] = useState<Partial<Record<keyof AtualizarPerfilDados | 'senhaAtual' | 'novaSenha' | 'confirmarNovaSenha', string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sincroniza dados com perfil
  useEffect(() => {
    if (perfil) {
      setDados({
        nome: perfil.nome,
        telefone: perfil.telefone || '',
        bio: perfil.bio || '',
        dataNascimento: perfil.dataNascimento || '',
        genero: perfil.genero,
        cpf: perfil.cpf || '',
      });
    }
  }, [perfil]);

  // Validação reward early - valida ao blur
  const handleBlur = useCallback((campo: string, valor: string) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));

    if (abaAtiva === 'perfil') {
      const erro = validarAtualizarPerfil({ [campo]: valor } as AtualizarPerfilDados);
      setErros((prev) => ({ ...prev, [campo]: erro }));
    } else {
      let erro: string | null = null;
      if (campo === 'senhaAtual' && !valor) erro = 'Senha atual é obrigatória';
      if (campo === 'novaSenha' && valor && valor.length < 8) erro = 'Mínimo 8 caracteres';
      if (campo === 'confirmarNovaSenha' && valor !== senhaDados.novaSenha) erro = 'Senhas não conferem';
      setErros((prev) => ({ ...prev, [campo]: erro }));
    }
  }, [abaAtiva, senhaDados.novaSenha]);

  // Validação punish late - valida tudo ao submeter
  const validarFormulario = useCallback((): boolean => {
    if (abaAtiva === 'perfil') {
      const erro = validarAtualizarPerfil(dados);
      if (erro) {
        setErroGeral(erro);
        return false;
      }
    } else {
      const erro = validarAlterarSenha(senhaDados);
      if (erro) {
        setErroGeral(erro);
        return false;
      }
    }
    setErroGeral(null);
    return true;
  }, [abaAtiva, dados, senhaDados]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setErroGeral(null);
    try {
      if (abaAtiva === 'perfil') {
        await aoSalvar(sanitizarPerfil(dados));
      } else if (aoAlterarSenha) {
        await aoAlterarSenha(senhaDados);
        setSenhaDados({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
      }
      aoFechar();
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }, [abaAtiva, dados, senhaDados, aoSalvar, aoAlterarSenha, aoFechar, validarFormulario]);

  const handleChangePerfil = useCallback((campo: keyof AtualizarPerfilDados, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    // Limpa erro ao digitar (reward early)
    if (touched[campo]) {
      setErros((prev) => ({ ...prev, [campo]: null }));
    }
  }, [touched]);

  const handleChangeSenha = useCallback((campo: keyof AlterarSenhaDados, valor: string) => {
    setSenhaDados((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) {
      setErros((prev) => ({ ...prev, [campo]: null }));
    }
  }, [touched]);

  const forcaSenha = calcularForcaSenha(senhaDados.novaSenha);

  if (!aberto) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={abaAtiva === 'perfil' ? 'Editar Perfil' : 'Alterar Senha'}
      tamanho="lg"
      className={`perfil-form ${className}`}
      data-testid={testId}
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Abas */}
        <div className="perfil-form__abas" role="tablist">
          <button
            role="tab"
            aria-selected={abaAtiva === 'perfil'}
            onClick={() => { setAbaAtiva('perfil'); setErroGeral(null); }}
            className={`perfil-form__aba ${abaAtiva === 'perfil' ? 'ativa' : ''}`}
            data-testid="aba-perfil"
          >
            Perfil
          </button>
          <button
            role="tab"
            aria-selected={abaAtiva === 'senha'}
            onClick={() => { setAbaAtiva('senha'); setErroGeral(null); }}
            className={`perfil-form__aba ${abaAtiva === 'senha' ? 'ativa' : ''}`}
            data-testid="aba-senha"
          >
            Senha
          </button>
        </div>

        {/* Erro geral */}
        {erroGeral && (
          <Alerta
            tipo="erro"
            mensagem={erroGeral}
            className="perfil-form__erro-geral"
            data-testid="erro-geral"
          />
        )}

        {/* Aba Perfil */}
        {abaAtiva === 'perfil' && (
          <div className="perfil-form__painel" role="tabpanel">
            <div className="perfil-form__grid">
              <Input
                label="Nome completo *"
                value={dados.nome || ''}
                onChange={(e) => handleChangePerfil('nome', e.target.value)}
                onBlur={(e) => handleBlur('nome', e.target.value)}
                erro={touched.nome ? erros.nome : undefined}
                placeholder="Seu nome completo"
                inputMode="text"
                autoComplete="name"
                required
                desabilitado={carregando}
                data-testid="input-nome"
              />

              <Input
                label="E-mail"
                value={perfil?.email || ''}
                readOnly
                helper="O e-mail não pode ser alterado aqui"
                data-testid="input-email"
              />

              <Input
                label="Telefone"
                value={dados.telefone || ''}
                onChange={(e) => handleChangePerfil('telefone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                onBlur={(e) => handleBlur('telefone', e.target.value)}
                erro={touched.telefone ? erros.telefone : undefined}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                autoComplete="tel"
                mascara={formatarTelefone}
                desabilitado={carregando}
                data-testid="input-telefone"
              />

              <Input
                label="CPF"
                value={dados.cpf || ''}
                onChange={(e) => handleChangePerfil('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                onBlur={(e) => handleBlur('cpf', e.target.value)}
                erro={touched.cpf ? erros.cpf : undefined}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                mascara={formatarCPF}
                desabilitado={carregando}
                data-testid="input-cpf"
              />

              <Input
                label="Data de nascimento"
                type="date"
                value={dados.dataNascimento || ''}
                onChange={(e) => handleChangePerfil('dataNascimento', e.target.value)}
                onBlur={(e) => handleBlur('dataNascimento', e.target.value)}
                erro={touched.dataNascimento ? erros.dataNascimento : undefined}
                max={new Date().toISOString().split('T')[0]}
                desabilitado={carregando}
                data-testid="input-data-nascimento"
              />

              <Select
                label="Gênero"
                value={dados.genero || ''}
                onChange={(e) => handleChangePerfil('genero', e.target.value as any)}
                opcoes={[
                  { valor: '', rotulo: 'Não informar' },
                  { valor: 'masculino', rotulo: 'Masculino' },
                  { valor: 'feminino', rotulo: 'Feminino' },
                  { valor: 'outro', rotulo: 'Outro' },
                  { valor: 'prefiro_nao_dizer', rotulo: 'Prefiro não dizer' },
                ]}
                placeholder="Selecione"
                desabilitado={carregando}
                data-testid="select-genero"
              />
            </div>

            <Textarea
              label="Bio"
              value={dados.bio || ''}
              onChange={(e) => handleChangePerfil('bio', e.target.value)}
              onBlur={(e) => handleBlur('bio', e.target.value)}
              erro={touched.bio ? erros.bio : undefined}
              placeholder="Conte um pouco sobre você..."
              maxLength={500}
              linhas={4}
              desabilitado={carregando}
              data-testid="textarea-bio"
            />
          </div>
        )}

        {/* Aba Senha */}
        {abaAtiva === 'senha' && aoAlterarSenha && (
          <div className="perfil-form__painel" role="tabpanel">
            <div className="perfil-form__grid">
              <Input
                label="Senha atual *"
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaDados.senhaAtual}
                onChange={(e) => handleChangeSenha('senhaAtual', e.target.value)}
                onBlur={(e) => handleBlur('senhaAtual', e.target.value)}
                erro={touched.senhaAtual ? erros.senhaAtual : undefined}
                placeholder="Sua senha atual"
                autoComplete="current-password"
                required
                desabilitado={carregando}
                sufixo={
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="perfil-form__toggle-senha"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    data-testid="toggle-senha-atual"
                  >
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                }
                data-testid="input-senha-atual"
              />

              <Input
                label="Nova senha *"
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaDados.novaSenha}
                onChange={(e) => handleChangeSenha('novaSenha', e.target.value)}
                onBlur={(e) => handleBlur('novaSenha', e.target.value)}
                erro={touched.novaSenha ? erros.novaSenha : undefined}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
                desabilitado={carregando}
                sufixo={
                  <ForcaSenha
                    forca={forcaSenha}
                    label={forcaSenha > 0 ? `Força: ${['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'][forcaSenha - 1]}` : ''}
                    className="perfil-form__forca-senha"
                    data-testid="forca-senha"
                  />
                }
                data-testid="input-nova-senha"
              />

              <Input
                label="Confirmar nova senha *"
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaDados.confirmarNovaSenha}
                onChange={(e) => handleChangeSenha('confirmarNovaSenha', e.target.value)}
                onBlur={(e) => handleBlur('confirmarNovaSenha', e.target.value)}
                erro={touched.confirmarNovaSenha ? erros.confirmarNovaSenha : undefined}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
                desabilitado={carregando}
                data-testid="input-confirmar-senha"
              />
            </div>

            <div className="perfil-form__regras-senha">
              <h4>Requisitos da senha:</h4>
              <ul>
                <li className={senhaDados.novaSenha.length >= 8 ? 'ok' : ''}>Pelo menos 8 caracteres</li>
                <li className={/[A-Z]/.test(senhaDados.novaSenha) ? 'ok' : ''}>Pelo menos uma maiúscula</li>
                <li className={/[a-z]/.test(senhaDados.novaSenha) ? 'ok' : ''}>Pelo menos uma minúscula</li>
                <li className={/[0-9]/.test(senhaDados.novaSenha) ? 'ok' : ''}>Pelo menos um número</li>
                <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senhaDados.novaSenha) ? 'ok' : ''}>Pelo menos um caractere especial</li>
              </ul>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="perfil-form__acoes">
          <BotaoSecundario
            tipo="button"
            onClick={aoFechar}
            desabilitado={carregando}
            data-testid="btn-cancelar"
          >
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario
            tipo="submit"
            carregando={carregando}
            data-testid="btn-salvar"
          >
            {abaAtiva === 'perfil' ? 'Salvar alterações' : 'Alterar senha'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
};

export default PerfilForm;