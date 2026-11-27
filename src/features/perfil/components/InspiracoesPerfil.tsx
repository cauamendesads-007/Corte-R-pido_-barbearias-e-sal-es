/**
 * InspiracoesPerfil - Aba de inspirações (favoritos) do perfil do usuário.
 */

import { useMemo } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoSecundario,
  Chip,
} from '@/componentes';
import { ICONES } from '@/constantes';
import type { Estabelecimento } from '@/tipos';

interface InspiracoesPerfilProps {
  favoritos: string[];
  estabelecimentos: Estabelecimento[];
  onRemoverFavorito: (id: string) => void;
  onVerEstabelecimento: (id: string) => void;
}

export const InspiracoesPerfil = ({
  favoritos,
  estabelecimentos,
  onRemoverFavorito,
  onVerEstabelecimento,
}: InspiracoesPerfilProps) => {
  const favoritosDetalhados = useMemo(() => {
    const estabMap = new Map(estabelecimentos.map((e) => [e.id, e]));
    return favoritos
      .map((id) => estabMap.get(id))
      .filter((e): e is Estabelecimento => !!e);
  }, [favoritos, estabelecimentos]);

  if (favoritosDetalhados.length === 0) {
    return (
      <div className="perfil__vazio" data-testid="inspiracoes-vazio">
        <span className="perfil__vazio-icone" aria-hidden="true">{ICONES.coracao}</span>
        <h3>Nenhuma inspiração salva</h3>
        <p>Salve estabelecimentos que você gosta para ver aqui.</p>
      </div>
    );
  }

  return (
    <div className="perfil__grade-inspiracoes" data-testid="grade-inspiracoes">
      {favoritosDetalhados.map((estabelecimento) => (
        <Cartao key={estabelecimento.id} variante="padrao" className="perfil__inspiracao-cartao">
          <CartaoCabecalho>
            <div className="perfil__inspiracao-topo">
              <div>
                <h3 className="perfil__inspiracao-nome">{estabelecimento.nome}</h3>
                <p className="perfil__inspiracao-localizacao">
                  {ICONES.mapa} {estabelecimento.cidade}
                </p>
              </div>
              <BotaoSecundario
                aoClicar={() => onRemoverFavorito(estabelecimento.id)}
                iconeEsquerda={ICONES.x}
                tamanho="pequeno"
                data-testid={`btn-remover-favorito-${estabelecimento.id}`}
                aria-label={`Remover ${estabelecimento.nome} dos favoritos`}
              >
                Remover
              </BotaoSecundario>
            </div>
          </CartaoCabecalho>
          <CartaoCorpo>
            <div className="perfil__inspiracao-info">
              {estabelecimento.sobre && (
                <p className="perfil__inspiracao-descricao">{estabelecimento.sobre}</p>
              )}
              <div className="perfil__inspiracao-tags">
                <Chip variante="nicho">{estabelecimento.nicho}</Chip>
                {estabelecimento.servicos?.slice(0, 3).map((servico) => (
                  <Chip key={servico.id} variante="padrao">{servico.nome}</Chip>
                ))}
              </div>
            </div>
            <div className="perfil__inspiracao-acoes">
              <BotaoSecundario
                aoClicar={() => onVerEstabelecimento(estabelecimento.id)}
                iconeEsquerda={ICONES.olho}
                tamanho="pequeno"
                data-testid={`btn-ver-${estabelecimento.id}`}
              >
                Ver estabelecimento
              </BotaoSecundario>
            </div>
          </CartaoCorpo>
        </Cartao>
      ))}
    </div>
  );
};