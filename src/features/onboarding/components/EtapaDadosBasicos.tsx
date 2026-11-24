/**
 * Etapa de Dados Básicos do Onboarding.
 */

import React, { useMemo } from 'react';
import { Container, CampoTexto, Textarea, ChipGrupo } from '@/componentes';
import { NICHOS_OPCOES } from '../types';
import { useOnboarding } from '../hooks/useOnboarding';
import './Onboarding.css';

interface EtapaDadosBasicosProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
}

export const EtapaDadosBasicos: React.FC<EtapaDadosBasicosProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
}) => {
  const { dados, atualizarDados, erros } = useOnboarding();

  const nichoSelecionado = useMemo(() => dados.nicho, [dados.nicho]);

  const handleNichoChange = (valores: string[]) => {
    if (valores.length > 0) {
      atualizarDados({ nicho: valores[0] as any });
    }
  };

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__dados-basicos">
      <header className="onboarding__cabecalho">
        <h2>Dados Básicos</h2>
        <p className="onboarding__descricao">Como seu estabelecimento deve aparecer para os clientes</p>
      </header>

      <div className="onboarding__formulario">
        <div className="onboarding__campo">
          <CampoTexto
            label="Nome do Estabelecimento *"
            placeholder="Ex: Barbearia do João, Salão Bella Vista"
            valor={dados.nome}
            aoAlterar={(v) => atualizarDados({ nome: v })}
            erro={erros.nome}
            obrigatorio
            autoFocus
            maxLength={80}
            autoComplete="organization"
          />
        </div>

        <div className="onboarding__campo">
          <CampoTexto
            label="Nome do Responsável *"
            placeholder="Seu nome completo"
            valor={dados.responsavel}
            aoAlterar={(v) => atualizarDados({ responsavel: v })}
            erro={erros.responsavel}
            obrigatorio
            maxLength={60}
            autoComplete="name"
          />
        </div>

        <div className="onboarding__campo">
          <label id="nicho-label" className="onboarding__label">Nicho de Atuação *</label>
          <ChipGrupo
            opcoes={NICHOS_OPCOES.map((n) => ({ valor: n.valor, rotulo: `${n.icone} ${n.label}` }))}
            _valores={nichoSelecionado ? [nichoSelecionado] : []}
            aoAlterar={handleNichoChange}
            className="onboarding__chip-grupo"
            label="Nicho de Atuação"
            multiplo={false}
          />
        </div>

        <div className="onboarding__campo">
          <Textarea
            label="Sobre o Estabelecimento *"
            placeholder="Conte um pouco sobre seu espaço, especialidades, história... (máx. 500 caracteres)"
            valor={dados.sobre}
            aoAlterar={(v) => atualizarDados({ sobre: v })}
            erro={erros.sobre}
            obrigatorio
            maxLength={500}
            linhas={4}
            className="onboarding__textarea"
          />
          <p className="onboarding__contador">{dados.sobre.length}/500</p>
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
          Próximo: Localização e Contato
        </button>
      </footer>
    </Container>
  );
};

export default EtapaDadosBasicos;