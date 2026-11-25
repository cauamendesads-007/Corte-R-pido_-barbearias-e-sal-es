/**
 * Componente Cartao - Card reutilizável com slots para header, media, body, footer.
 * Variantes: padrao, estabelecimento, publicacao, servico, agendamento.
 */

import React, { forwardRef } from 'react';
import type { PropsCartaoEstabelecimento } from '@/tipos';
import { Icone } from './Icone';
import { formatarMoeda, formatarNumeroCurto, formatarTempoRelativo, corTextoContrastante } from '@/utilitarios';
import { BotaoIcone, BotaoPrimario, BotaoSecundario, BotaoPerigo } from './Botao';
import './Cartao.css';

interface CartaoProps {
  variante?: 'padrao' | 'estabelecimento' | 'publicacao' | 'servico' | 'agendamento';
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  onClick?: () => void;
}

/** Card base com slots */
export const Cartao = forwardRef<HTMLDivElement, CartaoProps>(
  ({ variante = 'padrao', children, className = '', 'data-testid': testId, onClick, ...props }, ref) => {
    const classes = [
      'cartao',
      `cartao--${variante}`,
      onClick && 'cartao--clicavel',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        onClick={onClick}
        data-testid={testId}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Cartao.displayName = 'Cartao';

/** Slot Header do card */
export const CartaoCabecalho = ({ children, className = '', 'data-testid': testId }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) => (
  <header className={`cartao__cabecalho ${className}`} data-testid={testId}>
    {children}
  </header>
);

/** Slot Media (imagem/vídeo) */
export const CartaoMidia = ({
  src,
  alt,
  tipo = 'imagem',
  className = '',
  'data-testid': testId,
  children,
  style,
}: {
  src?: string;
  alt?: string;
  tipo?: 'imagem' | 'video';
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  if (children) {
    return <div className={`cartao__midia ${className}`} data-testid={testId} style={style}>{children}</div>;
  }

  if (!src) return null;

  return (
    <div className={`cartao__midia ${className}`} data-testid={testId} style={style}>
      {tipo === 'video' ? (
        <video src={src} controls preload="metadata" playsInline aria-label={alt || 'Vídeo'} />
      ) : (
        <img src={src} alt={alt || ''} loading="lazy" />
      )}
    </div>
  );
};

/** Slot Body do card */
export const CartaoCorpo = ({ children, className = '', 'data-testid': testId }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) => (
  <div className={`cartao__corpo ${className}`} data-testid={testId}>
    {children}
  </div>
);

/** Slot Footer do card */
export const CartaoRodape = ({ children, className = '', 'data-testid': testId }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) => (
  <footer className={`cartao__rodape ${className}`} data-testid={testId}>
    {children}
  </footer>
);

/** Badge/Tag para cards */
export const CartaoBadge = ({
  children,
  variante = 'padrao',
  className = '',
  'data-testid': testId,
}: {
  children: React.ReactNode;
  variante?: 'padrao' | 'primario' | 'sucesso' | 'aviso' | 'perigo';
  className?: string;
  'data-testid'?: string;
}) => (
  <span className={`cartao__badge cartao__badge--${variante} ${className}`} data-testid={testId}>
    {children}
  </span>
);

/** ============================================================================
 * CARTÕES ESPECÍFICOS DO DOMÍNIO
 * ============================================================================ */

/** Card de Estabelecimento (Marketplace, Feed, Perfil) */
interface CartaoEstabelecimentoProps extends PropsCartaoEstabelecimento {
  onClick?: () => void;
}

export const CartaoEstabelecimento = ({
  estabelecimento,
  distanciaKm,
  horarioDisponivelHoje,
  onClick,
  className = '',
  'data-testid': testId,
}: CartaoEstabelecimentoProps) => {
  const corFundo = estabelecimento.tema.cor;
  const corTexto = corTextoContrastante(corFundo);
  const precoMin = estabelecimento.servicos.length
    ? Math.min(...estabelecimento.servicos.map((s) => s.preco))
    : 0;
  const temFila = estabelecimento.fila.length > 0;
  const esperaEstimada = temFila ? estabelecimento.fila.length * estabelecimento.tempoMedioAtendimento : 0;

  return (
    <Cartao
      variante="estabelecimento"
      onClick={onClick}
      className={className}
      data-testid={testId}
    >
      <CartaoMidia
        className="cartao-estabelecimento__capa"
        style={{
          background: `linear-gradient(135deg, ${corFundo}, color-mix(in srgb, ${corFundo} 30%, #000))`,
        } as React.CSSProperties}
      >
        <CartaoBadge variante="padrao" className="cartao-estabelecimento__nicho">
          {estabelecimento.nicho === 'feminino' ? '♀ Salão' : estabelecimento.nicho === 'visagismo' ? 'Visagismo' : estabelecimento.nicho === 'infantil' ? 'Infantil' : 'Barbearia'}
        </CartaoBadge>

        <div
          className="cartao-estabelecimento__iniciais"
          style={{ background: corFundo, color: corTexto } as React.CSSProperties}
          aria-hidden="true"
        >
          {estabelecimento.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>

        {temFila && (
          <CartaoBadge variante="aviso" className="cartao-estabelecimento__fila">
            <Icone nome="relogio" tamanho={12} /> {estabelecimento.fila.length} na fila · ~{esperaEstimada} min
          </CartaoBadge>
        )}
      </CartaoMidia>

      <CartaoCorpo className="cartao-estabelecimento__corpo">
        <div className="cartao-estabelecimento__info">
          <div className="cartao-estabelecimento__avatar" style={{ background: corFundo, color: corTexto } as React.CSSProperties} aria-hidden="true">
            {estabelecimento.nome[0].toUpperCase()}
          </div>
          <div className="cartao-estabelecimento__textos">
            <h3 className="cartao-estabelecimento__nome">{estabelecimento.nome}</h3>
            <p className="cartao-estabelecimento__meta">
              {estabelecimento.avaliacao ? (
                <>
                  <Icone nome="estrela" tamanho={12} /> {estabelecimento.avaliacao.toFixed(1)}
                </>
              ) : (
                'Novo'
              )}
              {' · '}
              {estabelecimento.cidade}
              {distanciaKm !== undefined && (
                <>
                  {' · '}
                  {distanciaKm.toFixed(1).replace('.', ',')} km
                </>
              )}
            </p>
            <p className="cartao-estabelecimento__preco">a partir de {formatarMoeda(precoMin)}</p>
          </div>
        </div>

        {horarioDisponivelHoje && (
          <CartaoBadge variante="sucesso" className="cartao-estabelecimento__disponivel">
            <Icone nome="verificarCirculo" tamanho={12} /> Hoje, {horarioDisponivelHoje}
          </CartaoBadge>
        )}
      </CartaoCorpo>
    </Cartao>
  );
};

/** Card de Publicação (Feed) */
interface CartaoPublicacaoProps {
  publicacao: {
    id: string;
    estabelecimento: {
      id: string;
      nome: string;
      cidade: string;
      tema: { cor: string };
      avaliacao: number;
    };
    legenda: string;
    tagServico?: string;
    src?: string;
    tipo: 'imagem' | 'video';
    curtidas: number;
    salvos: number;
    comentarios: number;
    dataCriacao: number;
    usuarioCurtiu: boolean;
    usuarioSalvou: boolean;
  };
  aoCurtir: () => void;
  aoSalvar: () => void;
  aoCompartilhar: () => void;
  aoAbrir: () => void;
  aoAgendar: () => void;
  className?: string;
  'data-testid'?: string;
}

export const CartaoPublicacao = ({
  publicacao,
  aoCurtir,
  aoSalvar,
  aoCompartilhar,
  aoAbrir,
  aoAgendar,
  className = '',
  'data-testid': testId,
}: CartaoPublicacaoProps) => {
  const { estabelecimento, legenda, tagServico, src, tipo, curtidas, salvos, comentarios, dataCriacao, usuarioCurtiu, usuarioSalvou } = publicacao;
  const corEstabelecimento = estabelecimento.tema.cor;

  return (
    <Cartao variante="publicacao" className={className} data-testid={testId}>
      <CartaoCabecalho className="cartao-publicacao__cabecalho">
        <div
          className="cartao-publicacao__avatar"
          style={{ background: corEstabelecimento, color: corTextoContrastante(corEstabelecimento) } as React.CSSProperties}
          aria-hidden="true"
        >
          {estabelecimento.nome[0].toUpperCase()}
        </div>
        <div className="cartao-publicacao__estabelecimento">
          <button
            className="cartao-publicacao__nome-link"
            onClick={(e) => { e.stopPropagation(); aoAbrir(); }}
            data-testid={`${testId}-nome`}
          >
            {estabelecimento.nome}
          </button>
          <span className="cartao-publicacao__meta">
            {estabelecimento.cidade} · {formatarTempoRelativo(dataCriacao)}
          </span>
        </div>
      </CartaoCabecalho>

      {(src || tipo) ? (
        <CartaoMidia
          className="cartao-publicacao__midia"
          src={src}
          tipo={tipo}
          alt={`Publicação de ${tagServico || 'cabelo'} na ${estabelecimento.nome}`}
        >
          {!src && (
            <div
              className="cartao-publicacao__placeholder"
              style={{ background: `linear-gradient(135deg, ${corEstabelecimento}, color-mix(in srgb, ${corEstabelecimento} 25%, #000))` } as React.CSSProperties}
            >
              {tipo === 'video' ? '▶' : '✂'}
            </div>
          )}
          {tagServico && (
            <CartaoBadge variante="padrao" className="cartao-publicacao__tag">
              {tagServico}
            </CartaoBadge>
          )}
        </CartaoMidia>
      ) : null}

      <CartaoCorpo className="cartao-publicacao__corpo">
        <h3 className="cartao-publicacao__titulo">{tagServico || 'Publicação'}</h3>
        <p className="cartao-publicacao__preco-meta">
          <span className="cartao-publicacao__preco">{tagServico ? 'Preço do serviço' : ''}</span>
          <span className="cartao-publicacao__avaliacao">
            {estabelecimento.avaliacao ? `${<Icone nome="estrela" tamanho={12} />} ${estabelecimento.avaliacao.toFixed(1)}` : 'Novo'}
          </span>
        </p>
        <p className="cartao-publicacao__legenda">{legenda}</p>
      </CartaoCorpo>

      <CartaoRodape className="cartao-publicacao__rodape">
        <div className="cartao-publicacao__acoes">
          <BotaoIcone
            icone={usuarioCurtiu ? <Icone nome="coracao" tamanho={16} /> : <Icone nome="coracaoVazio" tamanho={16} />}
            variante="fantasma"
            tamanho="pequeno"
            aoClicar={aoCurtir}
            ariaLabel={usuarioCurtiu ? 'Descurtir' : 'Curtir'}
            data-testid={`${testId}-curtir`}
          />
          <span className="cartao-publicacao__contador">{formatarNumeroCurto(curtidas)}</span>

          <BotaoIcone
            icone={usuarioSalvou ? <Icone nome="salvar" tamanho={16} /> : <Icone nome="salvarVazio" tamanho={16} />}
            variante="fantasma"
            tamanho="pequeno"
            aoClicar={aoSalvar}
            ariaLabel={usuarioSalvou ? 'Remover das inspirações' : 'Salvar'}
            data-testid={`${testId}-salvar`}
          />
          <span className="cartao-publicacao__contador">{formatarNumeroCurto(salvos)}</span>

          <BotaoIcone
            icone={<Icone nome="compartilhar" tamanho={16} />}
            variante="fantasma"
            tamanho="pequeno"
            aoClicar={aoCompartilhar}
            ariaLabel="Compartilhar"
            data-testid={`${testId}-compartilhar`}
          />

          {comentarios > 0 && (
            <span className="cartao-publicacao__comentarios">
              <Icone nome="mensagem" tamanho={16} /> {formatarNumeroCurto(comentarios)}
            </span>
          )}
        </div>

        <div className="cartao-publicacao__acoes-principais">
          <BotaoSecundario tamanho="pequeno" aoClicar={aoAbrir} className="cartao-publicacao__ver">
            Ver publicação
          </BotaoSecundario>
          <BotaoPrimario tamanho="pequeno" aoClicar={aoAgendar} className="cartao-publicacao__agendar">
            Agendar
          </BotaoPrimario>
        </div>
      </CartaoRodape>
    </Cartao>
  );
};

/** Card de Serviço (Lista de serviços do barbeiro) */
interface CartaoServicoProps {
  servico: {
    id: string;
    nome: string;
    preco: number;
    duracaoMinutos: number;
    tag: string;
    midias?: Array<{ tipo: 'imagem' | 'video'; src: string }>;
  };
  selecionado: boolean;
  aoSelecionar: () => void;
  aoEditar?: () => void;
  aoExcluir?: () => void;
  aoAdicionarMidia?: (_arquivo: File) => void;
  className?: string;
  'data-testid'?: string;
}

export const CartaoServico = ({
  servico,
  selecionado,
  aoSelecionar,
  aoEditar,
  aoExcluir,
  aoAdicionarMidia,
  className = '',
  'data-testid': testId,
}: CartaoServicoProps) => {
  return (
    <Cartao variante="servico" className={className} data-testid={testId}>
      <CartaoCorpo className="cartao-servico__corpo">
        <label className="cartao-servico__linha">
          <input
            type="checkbox"
            checked={selecionado}
            onChange={aoSelecionar}
            className="cartao-servico__checkbox"
            aria-label={`Selecionar ${servico.nome}`}
          />
          <span className="cartao-servico__nome">{servico.nome}</span>
          <CartaoBadge variante="padrao" className="cartao-servico__tag">
            {servico.tag}
          </CartaoBadge>
        </label>

        <div className="cartao-servico__detalhes">
          <span className="cartao-servico__duracao"><Icone nome="relogio" tamanho={12} /> {servico.duracaoMinutos} min</span>
          <strong className="cartao-servico__preco">{formatarMoeda(servico.preco)}</strong>
        </div>

        {servico.midias && servico.midias.length > 0 && (
          <div className="cartao-servico__midias">
            {servico.midias.map((midia, i) => (
              <div key={i} className="cartao-servico__midia-wrapper">
                {midia.tipo === 'video' ? (
                  <video src={midia.src} controls preload="metadata" playsInline />
                ) : (
                  <img src={midia.src} alt="" loading="lazy" />
                )}
                {aoExcluir && (
                  <button
                    type="button"
                    className="cartao-servico__remover-midia"
                    onClick={(e) => { e.stopPropagation(); aoExcluir(); }}
                    aria-label="Remover mídia"
                  >
                    <Icone nome="fechar" tamanho={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {aoAdicionarMidia && (
          <label className="cartao-servico__add-midia">
            <Icone nome="mais" tamanho={16} /> Cortes exemplo
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => e.target.files?.[0] && aoAdicionarMidia(e.target.files[0])}
              hidden
            />
          </label>
        )}

        {(aoEditar || aoExcluir) && (
          <div className="cartao-servico__acoes">
            {aoEditar && (
              <BotaoIcone icone={<Icone nome="editar" tamanho={16} />} variante="fantasma" tamanho="pequeno" aoClicar={aoEditar} ariaLabel="Editar serviço" />
            )}
            {aoExcluir && (
              <BotaoIcone icone={<Icone nome="lixeira" tamanho={16} />} variante="perigo" tamanho="pequeno" aoClicar={aoExcluir} ariaLabel="Excluir serviço" />
            )}
          </div>
        )}
      </CartaoCorpo>
    </Cartao>
  );
};

/** Card de Agendamento (Lista de agendamentos) */
interface CartaoAgendamentoProps {
  agendamento: {
    id: string;
    estabelecimento: { nome: string };
    dia: string;
    horario: string;
    servicos: string;
    valorTotal: number;
    statusPagamento: 'no_local' | 'aguardando_pix' | 'pago';
    nomeCliente: string;
  };
  ehBarbeiro: boolean;
  aoReagendar?: () => void;
  aoCancelar?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const CartaoAgendamento = ({
  agendamento,
  ehBarbeiro,
  aoReagendar,
  aoCancelar,
  className = '',
  'data-testid': testId,
}: CartaoAgendamentoProps) => {
  const { estabelecimento, dia, horario, servicos, valorTotal, statusPagamento } = agendamento;
  const passado = new Date(`${dia}T${horario}`) < new Date();

  const statusConfig = {
    no_local: { label: 'Pagar no local', variante: 'padrao' as const },
    aguardando_pix: { label: 'Aguardando Pix', variante: 'aviso' as const },
    pago: { label: 'Confirmado', variante: 'sucesso' as const },
  }[statusPagamento];

  return (
    <Cartao variante="agendamento" className={className} data-testid={testId}>
      <CartaoCorpo className="cartao-agendamento__corpo">
        <div className="cartao-agendamento__cabecalho">
          <div>
            <strong className="cartao-agendamento__servico">{servicos}</strong>
            <br />
            <span className="cartao-agendamento__estabelecimento">
              {estabelecimento.nome} · {new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {horario} · {formatarMoeda(valorTotal)}
            </span>
            <br />
            <CartaoBadge variante={statusConfig.variante} className="cartao-agendamento__status">
              {statusConfig.label}
            </CartaoBadge>
          </div>
        </div>

        {!passado && !ehBarbeiro && (
          <CartaoRodape className="cartao-agendamento__acoes">
            {aoReagendar && (
              <BotaoSecundario tamanho="pequeno" aoClicar={aoReagendar}>
                Reagendar
              </BotaoSecundario>
            )}
            {aoCancelar && (
              <BotaoPerigo tamanho="pequeno" aoClicar={aoCancelar}>
                Cancelar
              </BotaoPerigo>
            )}
          </CartaoRodape>
        )}

        {passado && (
          <CartaoRodape className="cartao-agendamento__reagendar">
            <BotaoSecundario tamanho="pequeno" aoClicar={() => {}}>Agendar de novo</BotaoSecundario>
          </CartaoRodape>
        )}

        {ehBarbeiro && !passado && (
          <CartaoRodape className="cartao-agendamento__acoes-barbeiro">
            {aoReagendar && <BotaoSecundario tamanho="pequeno" aoClicar={aoReagendar}>Reagendar</BotaoSecundario>}
            {aoCancelar && <BotaoPerigo tamanho="pequeno" aoClicar={aoCancelar}>Cancelar</BotaoPerigo>}
          </CartaoRodape>
        )}
      </CartaoCorpo>
    </Cartao>
  );
};