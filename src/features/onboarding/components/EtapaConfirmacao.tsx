/**
 * Etapa de Confirmação do Onboarding.
 * Resumo de todos os dados antes de finalizar.
 */

import React, { useMemo } from 'react';
import { Container, BotaoPrimario, BotaoSecundario, Cartao, Chip, Icone } from '@/componentes';
import { useOnboarding } from '../hooks/useOnboarding';
import { formatarMoeda as formatarPreco } from '@/utilitarios/formatar';
import './Onboarding.css';

interface EtapaConfirmacaoProps {
  aoAvancar: () => void;
  aoVoltar: () => void;
  desabilitado?: boolean;
  concluido?: boolean;
}

export const EtapaConfirmacao: React.FC<EtapaConfirmacaoProps> = ({
  aoAvancar,
  aoVoltar,
  desabilitado = false,
  concluido = false,
}) => {
  const { dados, concluir, carregando, erros } = useOnboarding();

  const servicos = useMemo(() => dados.servicos, [dados.servicos]);
  const totalServicos = useMemo(
    () => servicos.reduce((acc, s) => acc + (s.preco || 0), 0),
    [servicos]
  );
  const ticketMedio = useMemo(
    () => servicos.length > 0 ? totalServicos / servicos.length : 0,
    [servicos, totalServicos]
  );

  const handleConcluir = () => {
    if (!concluido) {
      concluir();
    } else {
      aoAvancar(); // Navegar para o painel
    }
  };

  const formatarWhatsapp = (whatsapp: string) => {
    const nums = whatsapp.replace(/\D/g, '');
    if (nums.length === 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    if (nums.length === 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return whatsapp;
  };

  if (concluido) {
    return (
      <Container variante="com-cabecalho" className="onboarding__etapa onboarding__confirmacao onboarding__sucesso">
        <div className="onboarding__sucesso-conteudo" role="status" aria-live="polite">
          <div className="onboarding__sucesso-icone" aria-hidden="true">
            <Icone nome="verificarCirculo" tamanho={80} strokeWidth={1.5} />
          </div>
          <h2>Estabelecimento Criado com Sucesso!</h2>
          <p className="onboarding__sucesso-mensagem">
            Sua barbearia <strong>{dados.nome}</strong> está pronta para receber agendamentos.
          </p>

          <div className="onboarding__sucesso-detalhes">
            <p><strong>Slug:</strong> {dados.estabelecimentoId || 'gerado automaticamente'}</p>
            <p><strong>Status:</strong> Pendente de aprovação</p>
            <p><strong>Serviços cadastrados:</strong> {servicos.length}</p>
          </div>

          <div className="onboarding__sucesso-acoes">
            <BotaoPrimario
              aoClicar={aoAvancar}
              iconeEsquerda={<Icone nome="painel" tamanho={20} />}
              tamanho="grande"
              desabilitado={carregando}
            >
              Ir para o Painel
            </BotaoPrimario>
            <BotaoSecundario aoClicar={() => window.open(`/${dados.estabelecimentoId}`, '_blank')} tamanho="grande">
              Ver Página Pública
            </BotaoSecundario>
          </div>

          <p className="onboarding__sucesso-info">
            <span aria-hidden="true">💡</span>
            Sua página estará visível após aprovação da moderação. Enquanto isso, você pode
            acessar o painel para gerenciar serviços, horários e visualizar a prévia.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container variante="com-cabecalho" className="onboarding__etapa onboarding__confirmacao">
      <header className="onboarding__cabecalho">
        <h2>Confirmação</h2>
        <p className="onboarding__descricao">Revise todas as informações antes de finalizar</p>
      </header>

      <div className="onboarding__formulario onboarding__resumo">
        {/* Card: Dados Básicos */}
        <Cartao className="onboarding__resumo-card">
          <div className="onboarding__resumo-card-cabecalho">
            <Icone nome="usuarios" tamanho={20} />
            <h3>Dados Básicos</h3>
          </div>
          <dl className="onboarding__resumo-lista">
            <div><dt>Nome</dt><dd>{dados.nome}</dd></div>
            <div><dt>Responsável</dt><dd>{dados.responsavel}</dd></div>
            <div><dt>Nicho</dt><dd>
              <Chip variante="nicho">{dados.nicho.charAt(0).toUpperCase() + dados.nicho.slice(1)}</Chip>
            </dd></div>
            <div><dt>Sobre</dt><dd>{dados.sobre}</dd></div>
          </dl>
        </Cartao>

        {/* Card: Localização e Contato */}
        <Cartao className="onboarding__resumo-card">
          <div className="onboarding__resumo-card-cabecalho">
            <Icone nome="gps" tamanho={20} />
            <h3>Localização e Contato</h3>
          </div>
          <dl className="onboarding__resumo-lista">
            <div><dt>Endereço</dt><dd>{dados.endereco}, {dados.cidade}</dd></div>
            <div><dt>WhatsApp</dt><dd>{formatarWhatsapp(dados.whatsapp)}</dd></div>
            <div><dt>Horário</dt><dd>{dados.horarioFuncionamento.replace('-', ' às ')}</dd></div>
          </dl>
        </Cartao>

        {/* Card: Serviços */}
        <Cartao className="onboarding__resumo-card">
          <div className="onboarding__resumo-card-cabecalho">
            <Icone nome="lista" tamanho={20} />
            <h3>Serviços ({servicos.length})</h3>
          </div>
          <ul className="onboarding__resumo-servicos">
            {servicos.map((s, i) => (
              <li key={i} className="onboarding__resumo-servico-item">
                <span className="onboarding__resumo-servico-nome">{s.nome}</span>
                <span className="onboarding__resumo-servico-preco">{formatarPreco(s.preco)}</span>
              </li>
            ))}
          </ul>
          <div className="onboarding__resumo-totais">
            <span>Ticket médio: {formatarPreco(ticketMedio)}</span>
            <span>Total serviços: {formatarPreco(totalServicos)}</span>
          </div>
        </Cartao>

        {/* Card: Tema e Aparência */}
        <Cartao className="onboarding__resumo-card">
          <div className="onboarding__resumo-card-cabecalho">
            <Icone nome="paleta" tamanho={20} />
            <h3>Tema e Aparência</h3>
          </div>
          <dl className="onboarding__resumo-lista">
            <div><dt>Cor Principal</dt><dd>
              <span className="onboarding__cor-amostra" style={{ backgroundColor: dados.tema.cor }} aria-hidden="true"></span>
              {dados.tema.cor}
            </dd></div>
            <div><dt>Layout</dt><dd>{dados.tema.layout === 'classico' ? 'Clássico' : 'Moderno'}</dd></div>
            <div><dt>Título</dt><dd>{dados.tema.titulo || dados.nome}</dd></div>
            <div><dt>Subtítulo</dt><dd>{dados.tema.subtitulo || 'Não definido'}</dd></div>
          </dl>
        </Cartao>

        {/* Card: Pagamentos Pix */}
        <Cartao className="onboarding__resumo-card">
          <div className="onboarding__resumo-card-cabecalho">
            <Icone nome="pix" tamanho={20} />
            <h3>Pagamentos Pix</h3>
          </div>
          <dl className="onboarding__resumo-lista">
            <div><dt>Modo</dt><dd>
              <Chip variante={dados.configuracaoPix.modo === 'desativado' ? 'padrao' : 'selecao'}>
                {dados.configuracaoPix.modo === 'desativado' ? 'Desativado' :
                 dados.configuracaoPix.modo === 'opcional' ? 'Opcional' : 'Obrigatório'}
              </Chip>
            </dd></div>
            {dados.configuracaoPix.modo !== 'desativado' && (
              <>
                <div><dt>Chave Pix</dt><dd>{dados.configuracaoPix.chave}</dd></div>
                <div><dt>Sinal</dt><dd>{dados.configuracaoPix.percentualSinal}%</dd></div>
              </>
            )}
          </dl>
        </Cartao>

        {erros.submit && (
          <div className="onboarding__erro-global" role="alert">
            <Icone nome="alerta" tamanho={20} />
            {erros.submit}
          </div>
        )}
      </div>

      <footer className="onboarding__rodape">
        <button
          type="button"
          className="botao botao--secundario onboarding__botao-voltar"
          onClick={aoVoltar}
          disabled={desabilitado || carregando}
        >
          Voltar para Pagamentos
        </button>
        <button
          type="button"
          className="botao botao--primario onboarding__botao-finalizar"
          onClick={handleConcluir}
          disabled={desabilitado || carregando}
        >
          {carregando ? 'Finalizando...' : 'Finalizar Cadastro'}
        </button>
      </footer>
    </Container>
  );
};

export default EtapaConfirmacao;