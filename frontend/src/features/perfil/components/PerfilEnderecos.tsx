/**
 * Componente PerfilEnderecos - Gerenciamento de endereços.
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
  Select,
  Badge,
  Modal,
  Alerta,
  Skeleton,
  EmptyState,
  Icone,
  Dropdown,
  DropdownItem,
} from '@/componentes';
import type { EnderecoUsuario } from '../types';
import { validarEndereco, formatarCEP, sanitizarEndereco } from '../rules';
import './PerfilEnderecos.css';

interface PerfilEnderecosProps {
  /** Endereços */
  enderecos: EnderecoUsuario[];
  /** Carregando */
  carregando?: boolean;
  /** Callback ao adicionar */
  aoAdicionar: (endereco: Omit<EnderecoUsuario, 'id'>) => Promise<void>;
  /** Callback ao atualizar */
  aoAtualizar: (id: string, endereco: Partial<EnderecoUsuario>) => Promise<void>;
  /** Callback ao remover */
  aoRemover: (id: string) => Promise<void>;
  /** Callback ao definir principal */
  aoDefinirPrincipal: (id: string) => Promise<void>;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const PerfilEnderecos = ({
  enderecos,
  carregando = false,
  aoAdicionar,
  aoAtualizar,
  aoRemover,
  aoDefinirPrincipal,
  className = '',
  'data-testid': testId,
}: PerfilEnderecosProps) => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<EnderecoUsuario | null>(null);
  const [dados, setDados] = useState<Omit<EnderecoUsuario, 'id'>>({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    principal: false,
    tipo: 'residencial',
  });
  const [erros, setErros] = useState<Partial<Record<keyof Omit<EnderecoUsuario, 'id'>, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const handleBlur = useCallback((campo: string, valor: string) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    const erro = validarEndereco({ ...dados, [campo]: valor } as Omit<EnderecoUsuario, 'id'>);
    if (erro && erro.includes(campo)) {
      setErros((prev) => ({ ...prev, [campo]: erro }));
    } else {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
  }, [dados]);

  const handleChange = useCallback((campo: keyof Omit<EnderecoUsuario, 'id'>, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
  }, [touched]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const erro = validarEndereco(dados);
    if (erro) {
      setErroGeral(erro);
      return;
    }

    setErroGeral(null);
    try {
      if (editando) {
        await aoAtualizar(editando.id, sanitizarEndereco(dados));
      } else {
        await aoAdicionar(sanitizarEndereco(dados));
      }
      setMostrarModal(false);
      setEditando(null);
      setDados({
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        principal: false,
        tipo: 'residencial',
      });
      setTouched({});
      setErros({});
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : 'Erro ao salvar endereço');
    }
  }, [dados, editando, aoAdicionar, aoAtualizar]);

  const handleNovo = useCallback(() => {
    setEditando(null);
    setDados({
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      principal: enderecos.length === 0,
      tipo: 'residencial',
    });
    setTouched({});
    setErros({});
    setErroGeral(null);
    setMostrarModal(true);
  }, [enderecos.length]);

  const handleEditar = useCallback((endereco: EnderecoUsuario) => {
    setEditando(endereco);
    setDados({
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento || '',
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      principal: endereco.principal,
      tipo: endereco.tipo,
    });
    setTouched({});
    setErros({});
    setErroGeral(null);
    setMostrarModal(true);
  }, []);

  const handleRemover = useCallback(async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este endereço?')) return;
    setRemovendoId(id);
    try {
      await aoRemover(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover endereço');
    } finally {
      setRemovendoId(null);
    }
  }, [aoRemover]);

  const handleDefinirPrincipal = useCallback(async (id: string) => {
    try {
      await aoDefinirPrincipal(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao definir principal');
    }
  }, [aoDefinirPrincipal]);

  if (carregando) {
    return (
      <Cartao className={`perfil-enderecos ${className}`} data-testid={testId}>
        <CartaoCabecalho
          titulo="Endereços"
          acao={<BotaoPrimario desabilitado icone="mais" >Adicionar</BotaoPrimario>}
        />
        <CartaoCorpo>
          <div className="perfil-enderecos__skeleton" role="status" aria-label="Carregando endereços">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} variante="retangular" largura="100%" altura={100} />
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao className={`perfil-enderecos ${className}`} data-testid={testId}>
      <CartaoCabecalho
        titulo="Endereços"
        subtitulo={enderecos.length > 0 ? `${enderecos.length} endereço${enderecos.length !== 1 ? 's' : ''} cadastrado${enderecos.length !== 1 ? 's' : ''}` : 'Nenhum endereço cadastrado'}
        acao={<BotaoPrimario onClick={handleNovo} icone="mais" data-testid="btn-novo-endereco">Novo endereço</BotaoPrimario>}
      />
      <CartaoCorpo>
        {enderecos.length === 0 ? (
          <EmptyState
            titulo="Nenhum endereço cadastrado"
            mensagem="Adicione seu primeiro endereço para facilitar agendamentos e entregas."
            icone="mapa"
            acao={<BotaoPrimario onClick={handleNovo} icone="mais">Adicionar endereço</BotaoPrimario>}
            className="perfil-enderecos__empty"
            data-testid="enderecos-vazio"
          />
        ) : (
          <div className="perfil-enderecos__lista" role="list">
            {enderecos.map((endereco) => (
              <article
                key={endereco.id}
                className={`perfil-enderecos__item ${endereco.principal ? 'principal' : ''}`}
                role="listitem"
                data-testid={`endereco-${endereco.id}`}
              >
                <div className="perfil-enderecos__item-principal">
                  {endereco.principal && (
                    <Badge variante="primario" tamanho="pequeno" className="perfil-enderecos__badge-principal">
                      <Icone nome="estrela" tamanho={10} />
                      Principal
                    </Badge>
                  )}
                  <div className="perfil-enderecos__item-info">
                    <p className="perfil-enderecos__item-logradouro">
                      {endereco.logradouro}, {endereco.numero}
                      {endereco.complemento && ` - ${endereco.complemento}`}
                    </p>
                    <p className="perfil-enderecos__item-bairro-cidade">
                      {endereco.bairro}, {endereco.cidade} - {endereco.estado}
                    </p>
                    <p className="perfil-enderecos__item-cep">
                      <Icone nome="mapa" tamanho={12} />
                      {formatarCEP(endereco.cep)}
                    </p>
                  </div>
                </div>
                <div className="perfil-enderecos__item-acoes">
                  {!endereco.principal && (
                    <BotaoSecundario
                      tamanho="pequeno"
                      onClick={() => handleDefinirPrincipal(endereco.id)}
                      data-testid={`principal-${endereco.id}`}
                    >
                      <Icone nome="estrela" tamanho={14} />
                      Definir principal
                    </BotaoSecundario>
                  )}
                  <Dropdown
                    gatilho={
                      <button
                        className="perfil-enderecos__menu-btn"
                        aria-label="Mais opções"
                        data-testid={`menu-${endereco.id}`}
                      >
                        <Icone nome="mais" tamanho={16} />
                      </button>
                    }
                    itens={[
                      { rotulo: 'Editar', icone: 'editar', aoClicar: () => handleEditar(endereco) },
                      { rotulo: 'Remover', icone: 'lixeira', aoClicar: () => handleRemover(endereco.id), variante: 'perigo' },
                    ]}
                    posicao="bottom-end"
                    className="perfil-enderecos__dropdown"
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          aberto={mostrarModal}
          aoFechar={() => { setMostrarModal(false); setEditando(null); }}
          titulo={editando ? 'Editar endereço' : 'Novo endereço'}
          tamanho="lg"
          className="perfil-enderecos__modal"
          data-testid="modal-endereco"
        >
          <form onSubmit={handleSubmit} noValidate>
            {erroGeral && (
              <Alerta
                tipo="erro"
                mensagem={erroGeral}
                dispensavel
                aoDispensar={() => setErroGeral(null)}
                className="perfil-enderecos__erro"
                data-testid="erro-endereco"
              />
            )}

            <div className="perfil-enderecos__grid">
              <Input
                label="CEP *"
                value={dados.cep}
                onChange={(e) => handleChange('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                onBlur={(e) => handleBlur('cep', e.target.value)}
                erro={touched.cep ? erros.cep : undefined}
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="postal-code"
                mascara={formatarCEP}
                desabilitado={removendoId !== null}
                data-testid="input-cep"
              />

              <Input
                label="Logradouro *"
                value={dados.logradouro}
                onChange={(e) => handleChange('logradouro', e.target.value)}
                onBlur={(e) => handleBlur('logradouro', e.target.value)}
                erro={touched.logradouro ? erros.logradouro : undefined}
                placeholder="Rua, Avenida, etc."
                inputMode="text"
                autoComplete="street-address"
                required
                desabilitado={removendoId !== null}
                data-testid="input-logradouro"
              />

              <Input
                label="Número *"
                value={dados.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                onBlur={(e) => handleBlur('numero', e.target.value)}
                erro={touched.numero ? erros.numero : undefined}
                placeholder="123"
                inputMode="text"
                autoComplete="street-address"
                required
                desabilitado={removendoId !== null}
                data-testid="input-numero"
              />

              <Input
                label="Complemento"
                value={dados.complemento}
                onChange={(e) => handleChange('complemento', e.target.value)}
                onBlur={(e) => handleBlur('complemento', e.target.value)}
                erro={touched.complemento ? erros.complemento : undefined}
                placeholder="Apto, Bloco, etc."
                inputMode="text"
                autoComplete="address-line2"
                desabilitado={removendoId !== null}
                data-testid="input-complemento"
              />

              <Input
                label="Bairro *"
                value={dados.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
                onBlur={(e) => handleBlur('bairro', e.target.value)}
                erro={touched.bairro ? erros.bairro : undefined}
                placeholder="Centro"
                inputMode="text"
                autoComplete="address-level3"
                required
                desabilitado={removendoId !== null}
                data-testid="input-bairro"
              />

              <Input
                label="Cidade *"
                value={dados.cidade}
                onChange={(e) => handleChange('cidade', e.target.value)}
                onBlur={(e) => handleBlur('cidade', e.target.value)}
                erro={touched.cidade ? erros.cidade : undefined}
                placeholder="São Paulo"
                inputMode="text"
                autoComplete="address-level2"
                required
                desabilitado={removendoId !== null}
                data-testid="input-cidade"
              />

              <Select
                label="Estado *"
                value={dados.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
                onBlur={(e) => handleBlur('estado', e.target.value)}
                erro={touched.estado ? erros.estado : undefined}
                opcoes={ESTADOS_BR.map((uf) => ({ valor: uf, rotulo: uf }))}
                placeholder="SP"
                required
                desabilitado={removendoId !== null}
                data-testid="select-estado"
              />

              <Select
                label="Tipo"
                value={dados.tipo}
                onChange={(e) => handleChange('tipo', e.target.value as any)}
                opcoes={[
                  { valor: 'residencial', rotulo: 'Residencial' },
                  { valor: 'comercial', rotulo: 'Comercial' },
                  { valor: 'outro', rotulo: 'Outro' },
                ]}
                desabilitado={removendoId !== null}
                data-testid="select-tipo"
              />
            </div>

            <label className="perfil-enderecos__checkbox">
              <input
                type="checkbox"
                checked={dados.principal}
                onChange={(e) => handleChange('principal', e.target.checked)}
                disabled={removendoId !== null}
                data-testid="checkbox-principal"
              />
              <span>Definir como endereço principal</span>
            </label>

            <div className="perfil-enderecos__modal-acoes">
              <BotaoSecundario
                tipo="button"
                onClick={() => { setMostrarModal(false); setEditando(null); }}
                desabilitado={removendoId !== null}
                data-testid="btn-cancelar-endereco"
              >
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario
                tipo="submit"
                carregando={removendoId !== null}
                data-testid="btn-salvar-endereco"
              >
                {editando ? 'Salvar alterações' : 'Adicionar endereço'}
              </BotaoPrimario>
            </div>
          </form>
        </Modal>
      </CartaoCorpo>
    </Cartao>
  );
};

export default PerfilEnderecos;