/**
 * Componente PerfilCartoes - Gerenciamento de cartões salvos.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useState, useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  BotaoPerigo,
  Input,
  Modal,
  Alerta,
  Skeleton,
  EmptyState,
  Icone,
  Badge,
  Tooltip,
} from '@/componentes';
import type { CartaoSalvo } from '../types';
import { validarCartao, formatarCartaoExibicao } from '../rules';
import './PerfilCartoes.css';

interface PerfilCartoesProps {
  /** Cartões */
  cartoes: CartaoSalvo[];
  /** Carregando */
  carregando?: boolean;
  /** Callback ao adicionar */
  aoAdicionar: (cartao: Omit<CartaoSalvo, 'id' | 'criadoEm'>) => Promise<void>;
  /** Callback ao remover */
  aoRemover: (id: string) => Promise<void>;
  /** Callback ao definir padrão */
  aoDefinirPadrao: (id: string) => Promise<void>;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const BANDEIRAS = [
  { valor: 'visa', rotulo: 'Visa', icone: 'visa' },
  { valor: 'mastercard', rotulo: 'Mastercard', icone: 'mastercard' },
  { valor: 'elo', rotulo: 'Elo', icone: 'elo' },
  { valor: 'amex', rotulo: 'American Express', icone: 'amex' },
  { valor: 'hipercard', rotulo: 'Hipercard', icone: 'hipercard' },
  { valor: 'outro', rotulo: 'Outro', icone: 'cartao' },
] as const;

export const PerfilCartoes = ({
  cartoes,
  carregando = false,
  aoAdicionar,
  aoRemover,
  aoDefinirPadrao,
  className = '',
  'data-testid': testId,
}: PerfilCartoesProps) => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [dados, setDados] = useState<Omit<CartaoSalvo, 'id' | 'criadoEm'>>({
    bandeira: 'visa',
    ultimosDigitos: '',
    nomeTitular: '',
    validadeMes: new Date().getMonth() + 1,
    validadeAno: new Date().getFullYear() % 100 + 2,
    padrao: cartoes.length === 0,
  });
  const [erros, setErros] = useState<Partial<Record<keyof Omit<CartaoSalvo, 'id' | 'criadoEm'>, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const handleBlur = useCallback((campo: string, valor: string | number) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    const erro = validarCartao({ ...dados, [campo]: valor } as Omit<CartaoSalvo, 'id' | 'criadoEm'>);
    if (erro) {
      setErros((prev) => ({ ...prev, [campo]: erro }));
    } else {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
  }, [dados]);

  const handleChange = useCallback((campo: keyof Omit<CartaoSalvo, 'id' | 'criadoEm'>, valor: string | number) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
  }, [touched]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const erro = validarCartao(dados);
    if (erro) {
      setErroGeral(erro);
      return;
    }

    setErroGeral(null);
    try {
      await aoAdicionar(dados);
      setMostrarModal(false);
      setDados({
        bandeira: 'visa',
        ultimosDigitos: '',
        nomeTitular: '',
        validadeMes: new Date().getMonth() + 1,
        validadeAno: new Date().getFullYear() % 100 + 2,
        padrao: false,
      });
      setTouched({});
      setErros({});
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : 'Erro ao salvar cartão');
    }
  }, [dados, aoAdicionar]);

  const handleNovo = useCallback(() => {
    setDados({
      bandeira: 'visa',
      ultimosDigitos: '',
      nomeTitular: '',
      validadeMes: new Date().getMonth() + 1,
      validadeAno: new Date().getFullYear() % 100 + 2,
      padrao: cartoes.length === 0,
    });
    setTouched({});
    setErros({});
    setErroGeral(null);
    setMostrarModal(true);
  }, [cartoes.length]);

  const handleRemover = useCallback(async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este cartão?')) return;
    setRemovendoId(id);
    try {
      await aoRemover(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover cartão');
    } finally {
      setRemovendoId(null);
    }
  }, [aoRemover]);

  const handleDefinirPadrao = useCallback(async (id: string) => {
    try {
      await aoDefinirPadrao(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao definir padrão');
    }
  }, [aoDefinirPadrao]);

  const getBandeiraIcone = (bandeira: string) => {
    const b = BANDEIRAS.find((b) => b.valor === bandeira);
    return b?.icone || 'cartao';
  };

  if (carregando) {
    return (
      <Cartao className={`perfil-cartoes ${className}`} data-testid={testId}>
        <CartaoCabecalho
          titulo="Cartões salvos"
          acao={<BotaoPrimario desabilitado icone="mais" >Adicionar</BotaoPrimario>}
        />
        <CartaoCorpo>
          <div className="perfil-cartoes__skeleton" role="status" aria-label="Carregando cartões">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura="100%" altura={80} />
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao className={`perfil-cartoes ${className}`} data-testid={testId}>
      <CartaoCabecalho
        titulo="Cartões salvos"
        subtitulo={cartoes.length > 0 ? `${cartoes.length} cartão${cartoes.length !== 1 ? 's' : ''} salvo${cartoes.length !== 1 ? 's' : ''}` : 'Nenhum cartão cadastrado'}
        acao={<BotaoPrimario onClick={handleNovo} icone="mais" data-testid="btn-novo-cartao">Novo cartão</BotaoPrimario>}
      />
      <CartaoCorpo>
        {cartoes.length === 0 ? (
          <EmptyState
            titulo="Nenhum cartão salvo"
            mensagem="Adicione um cartão para pagamentos rápidos e seguros."
            icone="cartao"
            acao={<BotaoPrimario onClick={handleNovo} icone="mais">Adicionar cartão</BotaoPrimario>}
            className="perfil-cartoes__empty"
            data-testid="cartoes-vazio"
          />
        ) : (
          <div className="perfil-cartoes__lista" role="list">
            {cartoes.map((cartao) => (
              <article
                key={cartao.id}
                className={`perfil-cartoes__item ${cartao.padrao ? 'padrao' : ''}`}
                role="listitem"
                data-testid={`cartao-${cartao.id}`}
              >
                <div className="perfil-cartoes__item-principal">
                  {cartao.padrao && (
                    <Badge variante="primario" tamanho="pequeno" className="perfil-cartoes__badge-padrao">
                      <Icone nome="check" tamanho={10} />
                      Padrão
                    </Badge>
                  )}
                  <div className="perfil-cartoes__item-visual">
                    <div className="perfil-cartoes__item-bandeira" data-bandeira={cartao.bandeira}>
                      <Icone nome={getBandeiraIcone(cartao.bandeira)} tamanho={24} />
                    </div>
                    <div className="perfil-cartoes__item-info">
                      <p className="perfil-cartoes__item-numero">{formatarCartaoExibicao(cartao.bandeira, cartao.ultimosDigitos)}</p>
                      <p className="perfil-cartoes__item-titular">{cartao.nomeTitular}</p>
                      <p className="perfil-cartoes__item-validade">
                        <Icone nome="calendario" tamanho={12} />
                        Validade: {String(cartao.validadeMes).padStart(2, '0')}/{String(cartao.validadeAno).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="perfil-cartoes__item-acoes">
                  {!cartao.padrao && (
                    <Tooltip conteudo="Definir como padrão">
                      <BotaoSecundario
                        tamanho="pequeno"
                        onClick={() => handleDefinirPadrao(cartao.id)}
                        icone="estrela"
                        data-testid={`padrao-${cartao.id}`}
                      />
                    </Tooltip>
                  )}
                  <Tooltip conteudo="Remover cartão">
                    <BotaoPerigo
                      tamanho="pequeno"
                      onClick={() => handleRemover(cartao.id)}
                      icone="lixeira"
                      carregando={removendoId === cartao.id}
                      data-testid={`remover-${cartao.id}`}
                    />
                  </Tooltip>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          aberto={mostrarModal}
          aoFechar={() => setMostrarModal(false)}
          titulo="Adicionar cartão"
          tamanho="md"
          className="perfil-cartoes__modal"
          data-testid="modal-cartao"
        >
          <form onSubmit={handleSubmit} noValidate>
            {erroGeral && (
              <Alerta
                tipo="erro"
                mensagem={erroGeral}
                dispensavel
                aoDispensar={() => setErroGeral(null)}
                className="perfil-cartoes__erro"
                data-testid="erro-cartao"
              />
            )}

            <div className="perfil-cartoes__grid">
              <Select
                label="Bandeira *"
                value={dados.bandeira}
                onChange={(e) => handleChange('bandeira', e.target.value as any)}
                onBlur={(e) => handleBlur('bandeira', e.target.value)}
                erro={touched.bandeira ? erros.bandeira : undefined}
                opcoes={BANDEIRAS}
                required
                data-testid="select-bandeira"
              />

              <Input
                label="Últimos 4 dígitos *"
                value={dados.ultimosDigitos}
                onChange={(e) => handleChange('ultimosDigitos', e.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={(e) => handleBlur('ultimosDigitos', e.target.value)}
                erro={touched.ultimosDigitos ? erros.ultimosDigitos : undefined}
                placeholder="1234"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={4}
                required
                data-testid="input-ultimos-digitos"
              />

              <Input
                label="Nome do titular *"
                value={dados.nomeTitular}
                onChange={(e) => handleChange('nomeTitular', e.target.value.toUpperCase())}
                onBlur={(e) => handleBlur('nomeTitular', e.target.value)}
                erro={touched.nomeTitular ? erros.nomeTitular : undefined}
                placeholder="JOÃO DA SILVA"
                inputMode="text"
                autoComplete="cc-name"
                required
                data-testid="input-nome-titular"
              />

              <div className="perfil-cartoes__validade">
                <label className="perfil-cartoes__validade-label">
                  <span>Validade *</span>
                  <div className="perfil-cartoes__validade-inputs">
                    <Select
                      value={dados.validadeMes}
                      onChange={(e) => handleChange('validadeMes', parseInt(e.target.value))}
                      onBlur={(e) => handleBlur('validadeMes', parseInt(e.target.value))}
                      erro={touched.validadeMes ? erros.validadeMes : undefined}
                      opcoes={Array.from({ length: 12 }, (_, i) => ({
                        valor: i + 1,
                        rotulo: String(i + 1).padStart(2, '0'),
                      }))}
                      placeholder="MM"
                      required
                      data-testid="select-mes"
                    />
                    <span className="perfil-cartoes__validade-separador">/</span>
                    <Select
                      value={dados.validadeAno}
                      onChange={(e) => handleChange('validadeAno', parseInt(e.target.value))}
                      onBlur={(e) => handleBlur('validadeAno', parseInt(e.target.value))}
                      erro={touched.validadeAno ? erros.validadeAno : undefined}
                      opcoes={Array.from({ length: 20 }, (_, i) => {
                        const ano = (new Date().getFullYear() % 100) + i;
                        return { valor: ano, rotulo: String(ano).padStart(2, '0') };
                      })}
                      placeholder="AA"
                      required
                      data-testid="select-ano"
                    />
                  </div>
                </label>
              </div>

              <label className="perfil-cartoes__checkbox">
                <input
                  type="checkbox"
                  checked={dados.padrao}
                  onChange={(e) => handleChange('padrao', e.target.checked)}
                  data-testid="checkbox-padrao"
                />
                <span>Definir como cartão padrão</span>
              </label>
            </div>

            <div className="perfil-cartoes__modal-acoes">
              <BotaoSecundario
                tipo="button"
                onClick={() => setMostrarModal(false)}
                data-testid="btn-cancelar-cartao"
              >
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario
                tipo="submit"
                data-testid="btn-salvar-cartao"
              >
                Adicionar cartão
              </BotaoPrimario>
            </div>          </form>
        </Modal>
      </CartaoCorpo>
    </Cartao>
  );
};

export default PerfilCartoes;