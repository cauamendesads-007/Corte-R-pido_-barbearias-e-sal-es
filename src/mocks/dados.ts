/**
 * Dados simulados (mocks) para a aplicação Corte Rápido.
 * Dados realistas em português para desenvolvimento e testes.
 */

import type {
  Estabelecimento,
  Usuario,
  Servico,
  ItemGaleria,
  Avaliacao,
  PosicaoFila,
  Agendamento,
  Publicacao,
  Notificacao,
  NichoEstabelecimento,
  StatusAgendamento,
  PlanoAssinatura,
  AssinaturaEstabelecimento,
} from '@/tipos';
import { gerarId } from '@/utilitarios';

/** Nomes brasileiros para dados realistas */
const NOMES_BRASILEIROS = [
  'Rafael Silva', 'Camila Santos', 'Bruno Oliveira', 'Letícia Costa',
  'Thiago Souza', 'Juliana Lima', 'Diego Pereira', 'Amanda Rocha',
  'Lucas Almeida', 'Fernanda Martins', 'Gabriel Ribeiro', 'Carolina Alves',
  'Pedro Carvalho', 'Mariana Nascimento', 'Matheus Araújo', 'Beatriz Melo',
  'Felipe Barbosa', 'Larissa Gonçalves', 'Rodrigo Cardoso', 'Vanessa Teixeira',
];

/** Cores por nicho para variedade visual */
const CORES_NICHO: Record<NichoEstabelecimento, string[]> = {
  barbearia: ['#B45309', '#D97706', '#F59E0B', '#FBBF24', '#92400E'],
  feminino: ['#E8508A', '#EC4899', '#F472B6', '#F9A8D4', '#BE185D'],
  visagismo: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#5B21B6'],
  infantil: ['#FB923C', '#F97316', '#FDBA74', '#FFEDD5', '#C2410C'],
};
const _CORES_NICHO = CORES_NICHO;
void _CORES_NICHO;

function gerarServicos(nicho: NichoEstabelecimento): Servico[] {
  const servicosPorNicho: Record<NichoEstabelecimento, Omit<Servico, 'id' | 'midias'>[]> = {
    barbearia: [
      { nome: 'Corte Masculino', preco: 40, duracaoMinutos: 30, tag: 'corte' },
      { nome: 'Barba Completa', preco: 35, duracaoMinutos: 25, tag: 'barba' },
      { nome: 'Corte + Barba', preco: 65, duracaoMinutos: 50, tag: 'corte' },
      { nome: 'Corte Infantil', preco: 30, duracaoMinutos: 20, tag: 'infantil' },
      { nome: 'Pigmentação', preco: 50, duracaoMinutos: 40, tag: 'pigmentacao' },
      { nome: 'Sobrancelha', preco: 15, duracaoMinutos: 10, tag: 'sobrancelha' },
    ],
    feminino: [
      { nome: 'Corte Feminino', preco: 85, duracaoMinutos: 50, tag: 'corte' },
      { nome: 'Escova', preco: 60, duracaoMinutos: 40, tag: 'escova' },
      { nome: 'Coloração', preco: 160, duracaoMinutos: 120, tag: 'coloracao' },
      { nome: 'Hidratação', preco: 90, duracaoMinutos: 60, tag: 'hidratacao' },
      { nome: 'Manicure', preco: 45, duracaoMinutos: 40, tag: 'manicure' },
      { nome: 'Design de Sobrancelha', preco: 40, duracaoMinutos: 30, tag: 'sobrancelha' },
    ],
    visagismo: [
      { nome: 'Consultoria de Visagismo', preco: 120, duracaoMinutos: 60, tag: 'visagismo' },
      { nome: 'Corte Personalizado', preco: 90, duracaoMinutos: 45, tag: 'corte' },
      { nome: 'Design de Barba', preco: 70, duracaoMinutos: 40, tag: 'barba' },
      { nome: 'Colorimetria', preco: 130, duracaoMinutos: 60, tag: 'coloracao' },
    ],
    infantil: [
      { nome: 'Corte Infantil', preco: 35, duracaoMinutos: 25, tag: 'infantil' },
      { nome: 'Primeiro Corte', preco: 45, duracaoMinutos: 30, tag: 'infantil' },
      { nome: 'Corte + Penteado', preco: 50, duracaoMinutos: 35, tag: 'infantil' },
    ],
  };

  const base = servicosPorNicho[nicho] || servicosPorNicho.barbearia;
  return base.map((s, i) => ({
    ...s,
    id: `svc-${gerarId()}-${i}`,
    midias: [],
  }));
}

function gerarGaleria(nicho: NichoEstabelecimento, cor: string): ItemGaleria[] {
  const quantidade = 4 + Math.floor(Math.random() * 4);
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `gal-${gerarId()}-${i}`,
    src: `https://picsum.photos/seed/${nicho}-${cor.replace('#', '')}-${i}/400/400.jpg`,
    tipo: 'imagem' as const,
  }));
}

function gerarAvaliacoes(): Avaliacao[] {
  const comentarios = [
    'Atendimento excelente, profissional muito atencioso!',
    'Corte impecável, exatamente como pedi.',
    'Ambiente agradável e equipe simpática.',
    'Melhor barbearia da região, recomendo.',
    'Pontual e caprichoso, virei cliente fiel.',
    'Ótimo custo-benefício, volto com certeza.',
  ];
  const quantidade = 2 + Math.floor(Math.random() * 4);
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `av-${gerarId()}-${i}`,
    nomeCliente: NOMES_BRASILEIROS[Math.floor(Math.random() * NOMES_BRASILEIROS.length)].split(' ')[0],
    estrelas: 4 + Math.floor(Math.random() * 2), // 4 ou 5
    comentario: comentarios[Math.floor(Math.random() * comentarios.length)],
    data: new Date(Date.now() - Math.random() * 30 * 86400000).toLocaleDateString('pt-BR'),
  }));
}

function gerarFila(): PosicaoFila[] {
  const quantidade = Math.floor(Math.random() * 5);
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `fila-${gerarId()}-${i}`,
    nome: NOMES_BRASILEIROS[Math.floor(Math.random() * NOMES_BRASILEIROS.length)].split(' ')[0],
    horarioChegada: `${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }));
}

/** Gera todos os estabelecimentos mockados */
export function gerarEstabelecimentosMock(): Estabelecimento[] {
  const estabelecimentos: Estabelecimento[] = [
    {
      id: 'corte-rapido',
      slug: 'corte-rapido',
      nome: 'Corte Rápido',
      responsavel: 'Carlos Silva',
      cidade: 'Savassi',
      nicho: 'barbearia',
      avaliacao: 4.8,
      status: 'aprovado',
      latitude: -19.9391,
      longitude: -43.9386,
      whatsapp: '(31) 98765-4321',
      endereco: 'Rua das Flores, 120',
      sobre: 'Atendimento com hora marcada ou por ordem de chegada, em ambiente confortável e com profissionais experientes.',
      tema: {
        cor: '#F5B301',
        layout: 'classico',
        titulo: 'Corte rápido, sem perder o capricho',
        subtitulo: 'Barbearia clássica na Savassi. Entre na fila ou marque seu horário.',
      },
      servicos: gerarServicos('barbearia'),
      galeria: gerarGaleria('barbearia', '#F5B301'),
      fila: gerarFila(),
      tempoMedioAtendimento: 20,
      horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'opcional',
        chave: 'corte-rapido@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 250,
      taxaFidelidade: 90,
    },
    {
      id: 'face-e-forma',
      slug: 'face-e-forma',
      nome: 'Face e Forma',
      responsavel: 'Marina Duarte',
      cidade: 'Lourdes',
      nicho: 'visagismo',
      avaliacao: 4.9,
      status: 'aprovado',
      latitude: -19.9319,
      longitude: -43.9453,
      whatsapp: '(31) 99876-5432',
      endereco: 'Av. Brasil, 450',
      sobre: 'Análise de formato do rosto, cor e estilo antes da tesoura.',
      tema: {
        cor: '#2DD4BF',
        layout: 'moderno',
        titulo: 'O corte certo para o seu rosto',
        subtitulo: 'Análise de formato do rosto, cor e estilo antes da tesoura.',
      },
      servicos: gerarServicos('visagismo'),
      galeria: gerarGaleria('visagismo', '#2DD4BF'),
      fila: gerarFila(),
      tempoMedioAtendimento: 45,
      horarioFuncionamento: 'Ter a Sáb, 10h às 19h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'desativado',
        chave: '',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 180,
      taxaFidelidade: 85,
    },
    {
      id: 'bella-donna',
      slug: 'bella-donna',
      nome: 'Salão Bella Donna',
      responsavel: 'Paula Ribeiro',
      cidade: 'Funcionários',
      nicho: 'feminino',
      avaliacao: 4.7,
      status: 'aprovado',
      latitude: -19.9340,
      longitude: -43.9330,
      whatsapp: '(31) 98877-6655',
      endereco: 'Rua da Bahia, 200',
      sobre: 'Salão exclusivo para mulheres, com horários reservados e atendimento sem pressa.',
      tema: {
        cor: '#E8508A',
        layout: 'moderno',
        titulo: 'Seu momento, do seu jeito',
        subtitulo: 'Salão exclusivo para mulheres, com horários reservados e atendimento sem pressa.',
      },
      servicos: gerarServicos('feminino'),
      galeria: gerarGaleria('feminino', '#E8508A'),
      fila: gerarFila(),
      tempoMedioAtendimento: 40,
      horarioFuncionamento: 'Seg a Sáb, 9h às 19h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'obrigatorio',
        chave: 'bella-donna@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 320,
      taxaFidelidade: 95,
    },
    {
      id: 'barba-e-cia',
      slug: 'barba-e-cia',
      nome: 'Barba e Cia',
      responsavel: 'Wellington Matos',
      cidade: 'Centro',
      nicho: 'barbearia',
      avaliacao: 4.3,
      status: 'aprovado',
      latitude: -19.9208,
      longitude: -43.9378,
      whatsapp: '(31) 97766-5544',
      endereco: 'Rua dos Inconfidentes, 80',
      sobre: 'Atendimento rápido no Centro, de segunda a sábado.',
      tema: {
        cor: '#60A5FA',
        layout: 'classico',
        titulo: 'Preço justo, fila curta',
        subtitulo: 'Atendimento rápido no Centro, de segunda a sábado.',
      },
      servicos: gerarServicos('barbearia').slice(0, 3),
      galeria: gerarGaleria('barbearia', '#60A5FA'),
      fila: gerarFila(),
      tempoMedioAtendimento: 15,
      horarioFuncionamento: 'Seg a Sáb, 8h às 18h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'desativado',
        chave: '',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 120,
      taxaFidelidade: 80,
    },
    {
      id: 'studio-barbudos',
      slug: 'studio-barbudos',
      nome: 'Studio Barbudos',
      responsavel: 'Rogério Alves',
      cidade: 'Santo Agostinho',
      nicho: 'barbearia',
      avaliacao: 4.6,
      status: 'aprovado',
      latitude: -19.9275,
      longitude: -43.9487,
      whatsapp: '(31) 96655-4433',
      endereco: 'Av. Contorno, 1200',
      sobre: 'Ambiente reservado, cerveja gelada e atendimento sem pressa.',
      tema: {
        cor: '#A78BFA',
        layout: 'moderno',
        titulo: 'Barba e corte com hora marcada',
        subtitulo: 'Ambiente reservado, cerveja gelada e atendimento sem pressa.',
      },
      servicos: gerarServicos('barbearia'),
      galeria: gerarGaleria('barbearia', '#A78BFA'),
      fila: gerarFila(),
      tempoMedioAtendimento: 25,
      horarioFuncionamento: 'Ter a Dom, 10h às 20h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'opcional',
        chave: 'studio-barbudos@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 200,
      taxaFidelidade: 88,
    },
    {
      id: 'espaco-glam',
      slug: 'espaco-glam',
      nome: 'Espaço Glam',
      responsavel: 'Renata Souza',
      cidade: 'Savassi',
      nicho: 'feminino',
      avaliacao: 4.9,
      status: 'aprovado',
      latitude: -19.9372,
      longitude: -43.9340,
      whatsapp: '(31) 95544-3322',
      endereco: 'Rua Pernambuco, 300',
      sobre: 'Salão exclusivo para mulheres, com profissionais especializadas em cor e corte.',
      tema: {
        cor: '#F472B6',
        layout: 'classico',
        titulo: 'Realce o que você tem de melhor',
        subtitulo: 'Salão exclusivo para mulheres, com profissionais especializadas em cor e corte.',
      },
      servicos: gerarServicos('feminino'),
      galeria: gerarGaleria('feminino', '#F472B6'),
      fila: gerarFila(),
      tempoMedioAtendimento: 40,
      horarioFuncionamento: 'Seg a Sáb, 9h às 19h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'opcional',
        chave: 'espaco-glam@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 280,
      taxaFidelidade: 92,
    },
    {
      id: 'cabelo-de-rei',
      slug: 'cabelo-de-rei',
      nome: 'Cabelo de Rei',
      responsavel: 'Anderson Reis',
      cidade: 'Buritis',
      nicho: 'barbearia',
      avaliacao: 4.4,
      status: 'aprovado',
      latitude: -19.9770,
      longitude: -43.9600,
      whatsapp: '(31) 94433-2211',
      endereco: 'Av. Amazonas, 800',
      sobre: 'Atendimento rápido no Buritis, por ordem de chegada.',
      tema: {
        cor: '#34D399',
        layout: 'classico',
        titulo: 'Corte de rei com preço de vizinho',
        subtitulo: 'Atendimento rápido no Buritis, por ordem de chegada.',
      },
      servicos: gerarServicos('barbearia').slice(0, 4),
      galeria: gerarGaleria('barbearia', '#34D399'),
      fila: gerarFila(),
      tempoMedioAtendimento: 20,
      horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'desativado',
        chave: '',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 90,
      taxaFidelidade: 75,
    },
    {
      id: 'mini-barbeiros',
      slug: 'mini-barbeiros',
      nome: 'Mini Barbeiros',
      responsavel: 'Tatiane Lopes',
      cidade: 'Sion',
      nicho: 'infantil',
      avaliacao: 4.8,
      status: 'aprovado',
      latitude: -19.9505,
      longitude: -43.9290,
      whatsapp: '(31) 93322-1100',
      endereco: 'Rua Sergipe, 150',
      sobre: 'Espaço kids com brinquedos e profissionais pacientes.',
      tema: {
        cor: '#FB923C',
        layout: 'moderno',
        titulo: 'O primeiro corte sem choro',
        subtitulo: 'Espaço kids com brinquedos e profissionais pacientes.',
      },
      servicos: gerarServicos('infantil'),
      galeria: gerarGaleria('infantil', '#FB923C'),
      fila: gerarFila(),
      tempoMedioAtendimento: 25,
      horarioFuncionamento: 'Ter a Sáb, 10h às 18h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'opcional',
        chave: 'mini-barbeiros@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 150,
      taxaFidelidade: 95,
    },
    {
      id: 'visagismo-lab',
      slug: 'visagismo-lab',
      nome: 'Visagismo Lab',
      responsavel: 'Camila Nunes',
      cidade: 'Savassi',
      nicho: 'visagismo',
      avaliacao: 4.7,
      status: 'aprovado',
      latitude: -19.9355,
      longitude: -43.9400,
      whatsapp: '(31) 92211-0099',
      endereco: 'Rua Goiás, 250',
      sobre: 'Análise de formato do rosto, tom de pele e personalidade.',
      tema: {
        cor: '#818CF8',
        layout: 'classico',
        titulo: 'Seu estilo começa no seu rosto',
        subtitulo: 'Análise de formato do rosto, tom de pele e personalidade.',
      },
      servicos: gerarServicos('visagismo'),
      galeria: gerarGaleria('visagismo', '#818CF8'),
      fila: gerarFila(),
      tempoMedioAtendimento: 50,
      horarioFuncionamento: 'Qua a Sáb, 10h às 19h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'desativado',
        chave: '',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 110,
      taxaFidelidade: 82,
    },
    {
      id: 'salao-flor-de-liz',
      slug: 'salao-flor-de-liz',
      nome: 'Salão Flor de Liz',
      responsavel: 'Marta Figueiredo',
      cidade: 'Cidade Nova',
      nicho: 'feminino',
      avaliacao: 4.5,
      status: 'aprovado',
      latitude: -19.8990,
      longitude: -43.9300,
      whatsapp: '(31) 91100-9988',
      endereco: 'Av. Amazonas, 1500',
      sobre: 'Cabelo e unhas num só lugar, só para mulheres.',
      tema: {
        cor: '#FB7185',
        layout: 'moderno',
        titulo: 'Cuidado de ponta a ponta',
        subtitulo: 'Cabelo e unhas num só lugar, só para mulheres.',
      },
      servicos: gerarServicos('feminino'),
      galeria: gerarGaleria('feminino', '#FB7185'),
      fila: gerarFila(),
      tempoMedioAtendimento: 35,
      horarioFuncionamento: 'Seg a Sáb, 8h às 18h',
      permiteAutoEdicao: true,
      configuracaoPix: {
        modo: 'opcional',
        chave: 'flor-de-liz@pix.demo',
        percentualSinal: 30,
      },
      avaliacoes: gerarAvaliacoes(),
      seguidores: 160,
      taxaFidelidade: 85,
    },
    {
      id: 'navalha-de-ouro',
      slug: 'navalha-de-ouro',
      nome: 'Navalha de Ouro',
      responsavel: 'Eduardo Lima',
      cidade: 'Pampulha',
      nicho: 'barbearia',
      avaliacao: 0,
      status: 'pendente',
      latitude: -19.8514,
      longitude: -43.9704,
      whatsapp: '(31) 90099-8877',
      endereco: 'Rua Paraíba, 50',
      sobre: 'Aguardando aprovação.',
      tema: {
        cor: '#F5B301',
        layout: 'classico',
        titulo: 'Navalha de Ouro',
        subtitulo: 'Aguardando aprovação.',
      },
      servicos: [],
      galeria: [],
      fila: [],
      tempoMedioAtendimento: 20,
      horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
      permiteAutoEdicao: false,
      configuracaoPix: {
        modo: 'desativado',
        chave: '',
        percentualSinal: 30,
      },
      avaliacoes: [],
      seguidores: 0,
      taxaFidelidade: 0,
    },
  ];

  return estabelecimentos;
}

/** Gera usuários mockados */
export function gerarUsuariosMock(): Usuario[] {
  const estabelecimentos = gerarEstabelecimentosMock();
  const corteRapido = estabelecimentos.find(e => e.id === 'corte-rapido');
  const bellaDonna = estabelecimentos.find(e => e.id === 'bella-donna');
  const navalhaOuro = estabelecimentos.find(e => e.id === 'navalha-de-ouro');

  return [
    {
      id: 'usr-admin-1',
      email: 'admin@plataforma.com',
      senha: 'admin123', // Em produção seria hash
      papel: 'admin',
      nome: 'Administrador',
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    },
    {
      id: 'usr-cliente-1',
      email: 'cliente@demo.com',
      senha: '123456',
      papel: 'cliente',
      nome: 'João Cliente',
      bio: 'Gosto de cortes clássicos e barba bem feita.',
      whatsapp: '(31) 99999-8888',
      cidade: 'Savassi',
      avatar: '',
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [corteRapido!.id, bellaDonna!.id],
      inspiracoesSalvas: [],
    },
    {
      id: 'usr-barbeiro-1',
      email: 'carlos@corterapido.com',
      senha: '123456',
      papel: 'barbeiro',
      nome: 'Carlos Silva',
      estabelecimentoId: corteRapido!.id,
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    },
    {
      id: 'usr-barbeiro-2',
      email: 'bella@salao.com',
      senha: '123456',
      papel: 'barbeiro',
      nome: 'Paula Ribeiro',
      estabelecimentoId: bellaDonna!.id,
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    },
    {
      id: 'usr-barbeiro-3',
      email: 'navalha@ouro.com',
      senha: '123456',
      papel: 'barbeiro',
      nome: 'Eduardo Lima',
      estabelecimentoId: navalhaOuro!.id,
      confirmado: true,
      lembretesWhatsapp: true,
      seguindo: [],
      inspiracoesSalvas: [],
    },
  ];
}

/** Gera agendamentos mockados */
export function gerarAgendamentosMock(): Record<string, Agendamento[]> {
  const estabelecimentos = gerarEstabelecimentosMock();
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const depois = new Date(hoje);
  depois.setDate(depois.getDate() + 2);

  const agendamentos: Record<string, Agendamento[]> = {};

  estabelecimentos.forEach((est) => {
    if (est.status !== 'aprovado') return;
    agendamentos[est.id] = [
      {
        id: `bk-${gerarId()}`,
        estabelecimentoId: est.id,
        usuarioId: 'cliente@demo.com',
        dia: formatarParaInput(hoje),
        horario: '10:00',
        duracaoMinutos: 50,
        nomeCliente: 'João Cliente',
        telefoneCliente: '(31) 99999-8888',
        servicos: 'Corte + Barba',
        valorTotal: 65,
        statusPagamento: 'no_local',
        status: 'agendado' as StatusAgendamento,
        servicoIds: [est.servicos[0]?.id || '', est.servicos[1]?.id || ''].filter(Boolean),
      },
      {
        id: `bk-${gerarId()}`,
        estabelecimentoId: est.id,
        usuarioId: 'cliente@demo.com',
        dia: formatarParaInput(amanha),
        horario: '14:30',
        duracaoMinutos: 30,
        nomeCliente: 'João Cliente',
        telefoneCliente: '(31) 99999-8888',
        servicos: 'Corte Masculino',
        valorTotal: 40,
        statusPagamento: 'aguardando_pix',
        status: 'confirmado' as StatusAgendamento,
        servicoIds: [est.servicos[0]?.id || ''].filter(Boolean),
      },
    ];
  });

  return agendamentos;
}

/** Gera publicações mockadas */
export function gerarPublicacoesMock(): Publicacao[] {
  const estabelecimentos = gerarEstabelecimentosMock().filter(e => e.status === 'aprovado');
  const tags = ['corte', 'barba', 'pigmentacao', 'sobrancelha', 'coloracao', 'escova', 'hidratacao', 'manicure'];

  return Array.from({ length: 20 }, (_, i) => {
    const est = estabelecimentos[Math.floor(Math.random() * estabelecimentos.length)];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    const servico = est.servicos.find(s => s.tag === tag) || est.servicos[0];

    return {
      id: `post-${gerarId()}-${i}`,
      estabelecimentoId: est.id,
      tipo: (Math.random() > 0.3 ? 'imagem' : 'video') as 'imagem' | 'video',
      src: `https://picsum.photos/seed/post-${est.id}-${i}/600/750.jpg`,
      legenda: `Transformação incrível! ${servico?.nome || 'Serviço'} bem feito. #${tag} #${est.nome}`,
      tagServico: tag,
      curtidas: Array.from({ length: Math.floor(Math.random() * 50) }, () => `user-${gerarId()}`),
      salvos: Array.from({ length: Math.floor(Math.random() * 20) }, () => `user-${gerarId()}`),
      visualizacoes: Math.floor(Math.random() * 500) + 50,
      compartilhamentos: Math.floor(Math.random() * 30),
      comentarios: Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => ({
        id: `cmt-${gerarId()}-${j}`,
        nomeAutor: NOMES_BRASILEIROS[Math.floor(Math.random() * NOMES_BRASILEIROS.length)].split(' ')[0],
        texto: ['Ficou show!', 'Qual o valor?', 'Agendei o meu!', 'Top demais', 'Parabéns!'][Math.floor(Math.random() * 5)],
        dataCriacao: Date.now() - Math.random() * 7 * 86400000,
      })),
      dataCriacao: Date.now() - Math.random() * 30 * 86400000,
    };
  }).sort((a, b) => b.dataCriacao - a.dataCriacao);
}

/** Gera notificações mockadas */
export function gerarNotificacoesMock(): Notificacao[] {
  const notificacoes: Notificacao[] = [
    {
      id: `notif-${gerarId()}`,
      destinatario: 'cliente@demo.com',
      tipo: 'agendamento',
      titulo: 'Horário confirmado',
      texto: 'Corte + Barba no Corte Rápido, 15/01 às 10:00. Total R$ 65,00.',
      lida: false,
      dataCriacao: Date.now() - 2 * 3600000,
      estabelecimentoId: 'corte-rapido',
    },
    {
      id: `notif-${gerarId()}`,
      destinatario: 'cliente@demo.com',
      tipo: 'mensagem',
      titulo: 'Mensagem de Face e Forma',
      texto: 'Olá! Temos novidades em visagismo para você.',
      lida: false,
      dataCriacao: Date.now() - 5 * 3600000,
      estabelecimentoId: 'face-e-forma',
    },
    {
      id: `notif-${gerarId()}`,
      destinatario: 'carlos@corterapido.com',
      tipo: 'agendamento',
      titulo: 'Novo agendamento',
      texto: 'Maria Silva agendou Corte + Barba para 15/01 às 14:00.',
      lida: true,
      dataCriacao: Date.now() - 24 * 3600000,
      estabelecimentoId: 'corte-rapido',
    },
  ];
  return notificacoes;
}

/** Gera planos de assinatura */
export function gerarPlanosMock(): PlanoAssinatura[] {
  return [
    { id: 'mensal', nome: 'Mensalidade', tipo: 'mensal', preco: 89.90 },
    { id: 'diario', nome: 'Diária', tipo: 'diario', preco: 9.90 },
  ];
}

/** Gera assinaturas dos estabelecimentos */
export function gerarAssinaturasMock(): Record<string, AssinaturaEstabelecimento> {
  const planos = gerarPlanosMock();
  const hoje = new Date();
  const assinaturas: Record<string, AssinaturaEstabelecimento> = {};

  const estabelecimentos = gerarEstabelecimentosMock().filter(e => e.status === 'aprovado');

  estabelecimentos.forEach((est, i) => {
    const plano = planos[i % planos.length];
    const ehMensal = plano.tipo === 'mensal';
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - (ehMensal ? 30 : 5));
    const vencimento = new Date(hoje);
    vencimento.setDate(vencimento.getDate() + (ehMensal ? 30 : 1));

    assinaturas[est.id] = {
      planoId: plano.id,
      inicioContrato: formatarParaInput(inicio),
      vencimento: formatarParaInput(vencimento),
      desconto: i % 3 === 0 ? { tipo: 'percentual', valor: 10, motivo: 'Indicação' } : undefined,
      historicoPagamentos: [
        { data: formatarParaInput(new Date(inicio.getTime() - (ehMensal ? 30 : 1) * 86400000)), descricao: `${plano.nome} ${ehMensal ? '· 30 dias' : '· 1 dia'}`, valor: plano.preco },
        { data: formatarParaInput(inicio), descricao: `${plano.nome} ${ehMensal ? '· 30 dias' : '· 1 dia'}`, valor: plano.preco },
      ],
    };
  });

  return assinaturas;
}

/** Estado inicial completo da aplicação */
export function gerarEstadoInicial() {
  const estabelecimentos = gerarEstabelecimentosMock();
  const usuarios = gerarUsuariosMock();
  const agendamentos = gerarAgendamentosMock();
  const publicacoes = gerarPublicacoesMock();
  const notificacoes = gerarNotificacoesMock();
  const planos = gerarPlanosMock();
  const assinaturas = gerarAssinaturasMock();

  return {
    estabelecimentos,
    usuarios,
    agendamentos,
    publicacoes,
    notificacoes,
    planos,
    assinaturas,
    sessao: null,
    filtrosBusca: {
      nicho: 'todos',
      precoMaximo: 200,
      avaliacaoMinima: 0,
      tipoServico: '',
      ordenacao: 'avaliacao',
      apenasBemAvaliados: false,
      apenasVagasHoje: false,
      localizacaoUsuario: null,
    },
    abaBarbeiroAtiva: 'servicos',
    abaAdminAtiva: 'cadastros',
    abaClienteAtiva: 'agendamentos',
    filtroFeed: 'todos',
    filtroNotificacoes: 'todos',
    estabelecimentoAdminSelecionado: null,
    planoPagamentoVisivel: false,
  };
}

/** Função auxiliar para formatar data para input (YYYY-MM-DD) */
function formatarParaInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}