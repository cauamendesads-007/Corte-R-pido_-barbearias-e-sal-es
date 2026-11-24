/**
 * Etapa de Pagamentos Pix do Onboarding.
 * Configuração de recebimento via Pix.
 */

import React, { useMemo } from 'react';
import { Container, CampoTexto, ChipGrupo, Icone } from '@/componentes';
import { useOnboarding } from '../hooks/useOnboarding';
import './Onboarding.css';

interface EtapaPagamentosPixProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
}

const MODOS_PIX = [
  { valor: 'desativado', label: 'Desativado', descricao: 'Não aceitar pagamentos via Pix', icone: '❌' },
  { valor: 'opcional', label: 'Opcional', descricao: 'Cliente escolhe se paga no local ou via Pix', icone: '💳' },
  { valor: 'obrigatorio', label: 'Obrigatório', descricao: 'Exigir sinal via Pix para confirmar agendamento', icone: '🔒' },
];

export const EtapaPagamentosPix: React.FC<EtapaPagamentosPixProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
}) => {
  const { dados, atualizarDados, erros } = useOnboarding();

  const modoSelecionado = useMemo(() => dados.configuracaoPix.modo, [dados.configuracaoPix.modo]);
  const mostrarConfiguracoes = modoSelecionado !== 'desativado';

  const handleModoChange = (valores: string[]) => {
    if (valores.length > 0) {
      atualizarDados({
        configuracaoPix: { ...dados.configuracaoPix, modo: valores[0] as any },
      });
    }
  };

  const handleChaveChange = (valor: string) => {
    atualizarDados({
      configuracaoPix: { ...dados.configuracaoPix, chave: valor },
    });
  };

  const handlePercentualChange = (valor: string) => {
    const numero = parseInt(valor, 10);
    if (!isNaN(numero)) {
      atualizarDados({
        configuracaoPix: { ...dados.configuracaoPix, percentualSinal: Math.max(10, Math.min(100, numero)) },
      });
    }
  };

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__pagamentos-pix">
      <header className="onboarding__cabecalho">
        <h2>Pagamentos Pix</h2>
        <p className="onboarding__descricao">Configure como deseja receber pagamentos via Pix (opcional)</p>
      </header>

      <div className="onboarding__formulario">
        {/* Seletor de Modo */}
        <div className="onboarding__campo">
          <label className="onboarding__label">Modo de Pagamento Pix *</label>
          <ChipGrupo
            opcoes={MODOS_PIX.map((m) => ({ valor: m.valor, rotulo: `${m.icone} ${m.label}` }))}
            _valores={modoSelecionado ? [modoSelecionado] : []}
            aoAlterar={handleModoChange}
            className="onboarding__chip-grupo onboarding__chip-grupo--pix"
            label="Modo de Pagamento Pix"
            multiplo={false}
          />
          <p className="onboarding__ajuda">
            {MODOS_PIX.find((m) => m.valor === modoSelecionado)?.descricao}
          </p>
        </div>

        {/* Configurações condicionais */}
        {mostrarConfiguracoes && (
          <>
            <div className="onboarding__campo">
              <CampoTexto
                label="Chave Pix *"
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                valor={dados.configuracaoPix.chave}
                aoAlterar={handleChaveChange}
                erro={erros.configuracaoPix}
                obrigatorio
                maxLength={77}
                autoComplete="off"
              />
              <p className="onboarding__ajuda">
                Chave cadastrada no seu banco. Será exibida para o cliente pagar o sinal.
              </p>
            </div>

            <div className="onboarding__campo">
              <label className="onboarding__label">Percentual do Sinal (%) *</label>
              <div className="onboarding__percentual-input">
                <CampoTexto
                  label="Percentual do Sinal (%)"
                  tipo="number"
                  inputMode="numeric"
                  min={10}
                  max={100}
                  step={5}
                  valor={dados.configuracaoPix.percentualSinal.toString()}
                  aoAlterar={handlePercentualChange}
                  erro={erros.configuracaoPix}
                  obrigatorio
                  className="onboarding__percentual-campo"
                />
                <span className="onboarding__percentual-simbolo">%</span>
              </div>
              <p className="onboarding__ajuda">
                Valor que o cliente paga antecipadamente para confirmar o agendamento.
                Mínimo 10%, máximo 100% (pagamento total).
              </p>
            </div>

            <div className="onboarding__exemplo-calculo">
              <strong>Exemplo:</strong> Para um serviço de R$ 50,00 com sinal de {dados.configuracaoPix.percentualSinal}%,
              o cliente paga <strong>R$ {(50 * dados.configuracaoPix.percentualSinal / 100).toFixed(2).replace('.', ',')}</strong> via Pix
              e o restante no local.
            </div>
          </>
        )}

        {/* Informativo quando desativado */}
        {!mostrarConfiguracoes && (
          <div className="onboarding__info-desativado">
            <Icone nome="xCirculo" tamanho={48} />
            <h3>Pix Desativado</h3>
            <p>Os clientes pagarão apenas no local, no momento do atendimento.</p>
            <p className="onboarding__info-destaque">Você pode ativar o Pix a qualquer momento nas configurações.</p>
          </div>
        )}
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
          Próximo: Confirmação
        </button>
      </footer>
    </Container>
  );
};

export default EtapaPagamentosPix;