/**
 * Etapa de Tema e Aparência do Onboarding.
 * Personalização visual do estabelecimento.
 */

import React, { useMemo } from 'react';
import { Container, CampoTexto, ChipGrupo, Icone } from '@/componentes';
import { CORES_TEMA, LAYOUTS_DISPONIVEIS } from '../types';
import { useOnboarding } from '../hooks/useOnboarding';
import './Onboarding.css';

interface EtapaTemaAparenciaProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
}

export const EtapaTemaAparencia: React.FC<EtapaTemaAparenciaProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
}) => {
  const { dados, atualizarDados, erros } = useOnboarding();

  const corSelecionada = useMemo(() => dados.tema.cor, [dados.tema.cor]);
  const layoutSelecionado = useMemo(() => dados.tema.layout, [dados.tema.layout]);

  const handleCorChange = (cor: string) => {
    atualizarDados({ tema: { ...dados.tema, cor } });
  };

  const handleLayoutChange = (valores: string[]) => {
    if (valores.length > 0) {
      atualizarDados({ tema: { ...dados.tema, layout: valores[0] as any } });
    }
  };

  const handleTituloChange = (valor: string) => {
    atualizarDados({ tema: { ...dados.tema, titulo: valor } });
  };

  const handleSubtituloChange = (valor: string) => {
    atualizarDados({ tema: { ...dados.tema, subtitulo: valor } });
  };

  // Preview simplificado
  const previewStyle = useMemo(() => ({
    backgroundColor: dados.tema.cor,
    color: '#ffffff',
  }), [dados.tema.cor]);

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__tema-aparencia">
      <header className="onboarding__cabecalho">
        <h2>Tema e Aparência</h2>
        <p className="onboarding__descricao">Personalize a identidade visual do seu estabelecimento</p>
      </header>

      <div className="onboarding__formulario">
        {/* Seletor de Cor */}
        <div className="onboarding__campo">
          <label className="onboarding__label">Cor Principal *</label>
          <div className="onboarding__cores-grupo" role="radiogroup" aria-label="Cores do tema">
            {CORES_TEMA.map((cor) => (
              <button
                key={cor}
                type="button"
                className={`onboarding__cor-opcao ${corSelecionada === cor ? 'onboarding__cor-opcao--ativa' : ''}`}
                style={{ backgroundColor: cor }}
                onClick={() => handleCorChange(cor)}
                aria-pressed={corSelecionada === cor}
                aria-label={`Cor ${cor}`}
                disabled={desabilitado}
              >
                {corSelecionada === cor && (
                  <Icone nome="verificar" tamanho={20} cor="white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <div className="onboarding__cor-personalizada">
            <CampoTexto
              label="Ou insira cor personalizada (hex)"
              placeholder="#3b82f6"
              valor={corSelecionada}
              aoAlterar={(v) => {
                if (/^#[0-9a-fA-F]{6}$/.test(v)) handleCorChange(v);
              }}
              maxLength={7}
            />
          </div>
        </div>

        {/* Seletor de Layout */}
        <div className="onboarding__campo">
          <label className="onboarding__label">Layout da Página Pública *</label>
          <ChipGrupo
            opcoes={LAYOUTS_DISPONIVEIS.map((l) => ({ valor: l.valor, rotulo: l.label }))}
            _valores={layoutSelecionado ? [layoutSelecionado] : []}
            aoAlterar={handleLayoutChange}
            className="onboarding__chip-grupo onboarding__chip-grupo--layout"
            label="Layout da Página Pública"
            multiplo={false}
          />
          <p className="onboarding__ajuda">
            {layoutSelecionado === 'classico'
              ? 'Layout tradicional com sidebar lateral para navegação'
              : 'Layout moderno em cards, ideal para mobile'}
          </p>
        </div>

        {/* Título e Subtítulo */}
        <div className="onboarding__campo">
          <CampoTexto
            label="Título da Página *"
            placeholder="Nome do seu estabelecimento"
            valor={dados.tema.titulo}
            aoAlterar={handleTituloChange}
            erro={erros.tema}
            obrigatorio
            maxLength={60}
          />
          <p className="onboarding__ajuda">Aparece no topo da página pública e no cabeçalho</p>
        </div>

        <div className="onboarding__campo">
          <CampoTexto
            label="Subtítulo/Slogan"
            placeholder="Ex: A melhor barbearia do bairro • Cortes masculinos e barba"
            valor={dados.tema.subtitulo}
            aoAlterar={handleSubtituloChange}
            maxLength={120}
          />
          <p className="onboarding__ajuda">Descrição curta que aparece abaixo do título</p>
        </div>

        {/* Preview */}
        <div className="onboarding__campo">
          <label className="onboarding__label">Pré-visualização</label>
          <div className="onboarding__preview" style={previewStyle} role="img" aria-label="Pré-visualização do tema">
            <div className="onboarding__preview-conteudo">
              <h3>{dados.tema.titulo || 'Nome do Estabelecimento'}</h3>
              <p>{dados.tema.subtitulo || 'Seu subtítulo aqui'}</p>
              <div className="onboarding__preview-botoes">
                <span className="onboarding__preview-botao">Agendar</span>
                <span className="onboarding__preview-botao onboarding__preview-botao--secundario">Ver Serviços</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="onboarding__rodape">
        <button
          type="button"
          className="botao botao--secundario onboarding__botao-voltar"
          onClick={aoVoltar}
          disabled={desabilitado}
        >
          Voltar
        </button>
        <button
          type="button"
          className="botao botao--primario onboarding__botao-avancar"
          onClick={aoAvancar}
          disabled={desabilitado}
        >
          Próximo: Pagamentos Pix
        </button>
      </footer>
    </Container>
  );
};

export default EtapaTemaAparencia;