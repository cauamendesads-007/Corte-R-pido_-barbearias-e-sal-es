/**
 * PainelGaleriaBarbeiro - Galeria de cortes do estabelecimento (placeholder).
 */

import { BotaoPrimario } from '@/componentes';
import { ICONES } from '@/constantes';

export const PainelGaleriaBarbeiro = () => {
  return (
    <div className="painel__painel" role="tabpanel" id="painel-galeria" aria-labelledby="aba-galeria">
      <div className="painel__secao-cabecalho">
        <h2>Galeria de cortes</h2>
        <BotaoPrimario>Adicionar foto/vídeo</BotaoPrimario>
      </div>
      <div className="painel__vazio" data-testid="painel-galeria-vazio">
        <div className="painel__vazio-icone">{ICONES.foto}</div>
        <h3>Galeria vazia</h3>
        <p>Adicione fotos dos seus cortes para atrair mais clientes.</p>
      </div>
    </div>
  );
};