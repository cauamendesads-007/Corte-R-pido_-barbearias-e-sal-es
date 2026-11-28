/**
 * Componente EstabelecimentoCard - Card de estabelecimento para marketplace.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { Cartao, CartaoCorpo, CartaoCabecalho, CartaoRodape, Chip, Botao, BotaoSecundario, Icone, Skeleton } from '@/componentes';
import type { EstabelecimentoComputado } from '../types';
import './EstabelecimentoCard.css';

interface EstabelecimentoCardProps {
  /** Dados computados do estabelecimento */
  estabelecimento: EstabelecimentoComputado;
  /** Variante de exibição */
  variante?: 'marketplace' | 'lista' | 'compacto';
  /** Callback ao clicar no card */
  aoClicar?: () => void;
  /** Callback para seguir/deixar de seguir */
  aoSeguir?: (estabelecimentoId: string) => void;
  /** Callback para entrar na fila */
  aoEntrarNaFila?: (estabelecimentoId: string) => void;
  /** Mostra botão de seguir */
  mostrarSeguir?: boolean;
  /** Mostra botão de fila */
  mostrarFila?: boolean;
  /** Indica se está seguindo */
  seguindo?: boolean;
  /** Carregando ação de seguir */
  seguindoCarregando?: boolean;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const EstabelecimentoCard = ({
  estabelecimento,
  variante = 'marketplace',
  aoClicar,
  aoSeguir,
  aoEntrarNaFila,
  mostrarSeguir = true,
  mostrarFila = false,
  seguindo = false,
  seguindoCarregando = false,
  className = '',
  'data-testid': testId,
}: EstabelecimentoCardProps) => {
  const { estabelecimento: est, distanciaKm, avaliacaoMedia, totalAvaliacoes, servicosComMidia, horarioDisponivelHoje } = estabelecimento;
  const precoMin = est.servicos.length ? Math.min(...est.servicos.map((s) => s.preco)) : 0;
  const precoMax = est.servicos.length ? Math.max(...est.servicos.map((s) => s.preco)) : 0;
  const temVariasPrecos = precoMin !== precoMax && est.servicos.length > 1;

  const nichoLabels: Record<string, string> = {
    barbearia: 'Barbearia',
    feminino: 'Salão Feminino',
    visagismo: 'Visagismo',
    infantil: 'Infantil',
  };

  const handleClick = () => {
    if (aoClicar) {
      aoClicar();
    }
  };

  const handleSeguir = () => {
    aoSeguir?.(est.id);
  };

  const handleFila = () => {
    aoEntrarNaFila?.(est.id);
  };

  if (variante === 'compacto') {
    return (
      <Cartao
        variante="padrao"
        className={`estabelecimento-card estabelecimento-card--compacto ${className}`}
        onClick={aoClicar}
        data-testid={testId}
      >
        <CartaoCorpo className="estabelecimento-card__corpo-compacto">
          <div className="estabelecimento-card__info-compacto">
            <div className="estabelecimento-card__avatar-compacto" style={{ backgroundColor: est.tema.cor }}>
              <Icone nome="tesoura" tamanho={20} />
            </div>
            <div className="estabelecimento-card__textos-compacto">
              <h3 className="estabelecimento-card__nome-compacto">{est.nome}</h3>
              <span className="estabelecimento-card__cidade-compacto">{est.cidade}</span>
            </div>
          </div>
          <div className="estabelecimento-card__meta-compacto">
            <span className="estabelecimento-card__avaliacao-compacto">
              <Icone nome="estrela" tamanho={14} /> {avaliacaoMedia.toFixed(1)}
            </span>
            {distanciaKm && (
              <span className="estabelecimento-card__distancia-compacto">
                <Icone nome="localizacao" tamanho={14} /> {distanciaKm} km
              </span>
            )}
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao
      variante="padrao"
      className={`estabelecimento-card ${className}`}
      onClick={handleClick}
      data-testid={testId}
    >
      <CartaoCabecalho className="estabelecimento-card__cabecalho">
        <div className="estabelecimento-card__avatar" style={{ backgroundColor: est.tema.cor }}>
          {est.galeria.length > 0 && est.galeria[0].src ? (
            <img
              src={est.galeria[0].src}
              alt={est.nome}
              className="estabelecimento-card__avatar-img"
              loading="lazy"
            />
          ) : (
            <Icone nome="tesoura" tamanho={28} />
          )}
        </div>
        <div className="estabelecimento-card__info">
          <div className="estabelecimento-card__header-linha">
            <h3 className="estabelecimento-card__nome">{est.nome}</h3>
            <Chip variante="nicho">
              {nichoLabels[est.nicho] || est.nicho}
            </Chip>
          </div>
          <div className="estabelecimento-card__meta">
            <span className="estabelecimento-card__cidade">
              <Icone nome="localizacao" tamanho={14} /> {est.cidade}
            </span>
            {distanciaKm && (
              <span className="estabelecimento-card__distancia">
                <Icone nome="mapa" tamanho={14} /> {distanciaKm} km
              </span>
            )}
            <span className="estabelecimento-card__fila">
              <Icone nome="usuarios" tamanho={14} /> {est.fila.length} na fila
            </span>
          </div>
        </div>
        <div className="estabelecimento-card__avaliacao">
          <Icone nome="estrela" tamanho={16} />
          <span>{avaliacaoMedia.toFixed(1)}</span>
          <span className="estabelecimento-card__avaliacao-contagem">({totalAvaliacoes})</span>
        </div>
      </CartaoCabecalho>

      <CartaoCorpo className="estabelecimento-card__corpo">
        {est.sobre && (
          <p className="estabelecimento-card__sobre">{est.sobre}</p>
        )}

        <div className="estabelecimento-card__servicos">
          {servicosComMidia.slice(0, 3).map((servico) => (
            <div key={servico.id} className="estabelecimento-card__servico">
              {servico.midias && servico.midias.length > 0 && servico.midias[0].src && (
                <img
                  src={servico.midias[0].src}
                  alt={servico.nome}
                  className="estabelecimento-card__servico-img"
                  loading="lazy"
                />
              )}
              <div className="estabelecimento-card__servico-info">
                <span className="estabelecimento-card__servico-nome">{servico.nome}</span>
                <span className="estabelecimento-card__servico-preco">
                  R$ {servico.preco.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          ))}
          {est.servicos.length > 3 && (
            <span className="estabelecimento-card__mais-servicos">
              +{est.servicos.length - 3} serviços
            </span>
          )}
        </div>

        <div className="estabelecimento-card__preco">
          {temVariasPrecos ? (
            <>
              <span className="estabelecimento-card__preco-label">A partir de</span>
              <span className="estabelecimento-card__preco-valor">R$ {precoMin.toFixed(2).replace('.', ',')}</span>
            </>
          ) : (
            <>
              <span className="estabelecimento-card__preco-valor">R$ {precoMin.toFixed(2).replace('.', ',')}</span>
            </>
          )}
          {horarioDisponivelHoje && (
            <span className="estabelecimento-card__horario">{horarioDisponivelHoje}</span>
          )}
        </div>
      </CartaoCorpo>

      <CartaoRodape className="estabelecimento-card__rodape">
        <div className="estabelecimento-card__acoes">
          {mostrarSeguir && (
            <Botao
              aoClicar={handleSeguir}
              carregando={seguindoCarregando}
              iconeEsquerda={<Icone nome={seguindo ? 'coracao' : 'coracaoVazio'} tamanho={16} />}
              variante={seguindo ? 'primario' : 'secundario'}
              data-testid={`estabelecimento-seguir-${est.id}`}
            >
              {seguindo ? 'Seguindo' : 'Seguir'}
            </Botao>
          )}
          {mostrarFila && est.servicos.length > 0 && (
            <BotaoSecundario
              aoClicar={handleFila}
              iconeEsquerda={<Icone nome="relogio" tamanho={16} />}
              data-testid={`estabelecimento-fila-${est.id}`}
            >
              Entrar na fila
            </BotaoSecundario>
          )}
        </div>
      </CartaoRodape>
    </Cartao>
  );
};

/** Skeleton do card */
export const EstabelecimentoCardSkeleton = ({
  variante = 'marketplace',
  className = '',
}: { variante?: 'marketplace' | 'compacto'; className?: string }) => {
  if (variante === 'compacto') {
    return (
      <Cartao variante="padrao" className={`estabelecimento-card estabelecimento-card--compacto ${className}`}>
        <CartaoCorpo className="estabelecimento-card__corpo-compacto">
          <div className="estabelecimento-card__info-compacto">
            <Skeleton variante="circular" largura={40} altura={40} />
            <div className="estabelecimento-card__textos-compacto">
              <Skeleton variante="retangular" largura="60%" altura={16} />
              <Skeleton variante="retangular" largura="40%" altura={12} />
            </div>
          </div>
          <div className="estabelecimento-card__meta-compacto">
            <Skeleton variante="retangular" largura="80px" altura={14} />
            <Skeleton variante="retangular" largura="70px" altura={14} />
          </div>
        </CartaoCorpo>
      </Cartao>
    );
  }

  return (
    <Cartao variante="padrao" className={`estabelecimento-card ${className}`}>
      <CartaoCabecalho className="estabelecimento-card__cabecalho">
        <Skeleton variante="circular" largura={56} altura={56} />
        <div className="estabelecimento-card__info">
          <div className="estabelecimento-card__header-linha">
            <Skeleton variante="retangular" largura="60%" altura={20} />
            <Skeleton variante="retangular" largura="80px" altura={24} />
          </div>
          <div className="estabelecimento-card__meta">
            <Skeleton variante="retangular" largura="100px" altura={14} />
            <Skeleton variante="retangular" largura="80px" altura={14} />
            <Skeleton variante="retangular" largura="90px" altura={14} />
          </div>
        </div>
        <Skeleton variante="retangular" largura="60px" altura={20} />
      </CartaoCabecalho>
      <CartaoCorpo className="estabelecimento-card__corpo">
        <Skeleton variante="retangular" largura="100%" altura={14} />
        <Skeleton variante="retangular" largura="100%" altura={14} />
        <div className="estabelecimento-card__servicos">
          <Skeleton variante="retangular" largura="100%" altura={60} />
          <Skeleton variante="retangular" largura="100%" altura={60} />
          <Skeleton variante="retangular" largura="100%" altura={60} />
        </div>
        <Skeleton variante="retangular" largura="120px" altura={24} />
      </CartaoCorpo>
      <CartaoRodape className="estabelecimento-card__rodape">
        <Skeleton variante="retangular" largura="100px" altura={40} />
        <Skeleton variante="retangular" largura="120px" altura={40} />
      </CartaoRodape>
    </Cartao>
  );
};

export default EstabelecimentoCard;