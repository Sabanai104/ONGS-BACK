import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { Ong } from "../models/Ong";

/**
 * Dados reais de ONGs brasileiras conhecidas, levantados via busca na web
 * (sites oficiais, Instagram e Wikipédia) em julho/2026.
 *
 * Observações sobre a qualidade dos dados:
 * - Endereços, sites e Instagrams foram confirmados nas fontes oficiais.
 * - Coordenadas (latitude/longitude) são estimativas ao nível de bairro/quadra
 *   (não há uma ferramenta de geocodificação disponível neste ambiente),
 *   suficientes para exibição em mapa, mas não para navegação precisa porta a porta.
 * - "imagem": quando não foi possível confirmar uma URL de logo estável (Wikimedia
 *   Commons), foi usado um placeholder neutro (placehold.co) para não linkar imagens
 *   de terceiros não verificadas.
 */
const ongsSeed = [
  {
    titulo: "Amigos do Bem",
    imagem: "https://placehold.co/800x600?text=Amigos+do+Bem",
    descricao:
      "Organização não governamental brasileira fundada em 1993 que desenvolve projetos de combate à fome e à miséria no sertão nordestino, atuando em educação, geração de trabalho e renda, água, saúde e moradia.",
    comoAjudar:
      "Doações mensais (apadrinhamento), doação de bens e imóveis em herança, campanhas de arrecadação e voluntariado corporativo.",
    impactosRealizados:
      "Atende mensalmente cerca de 150 mil pessoas em aproximadamente 300 povoados do sertão de Alagoas, Pernambuco e Ceará.",
    localizacao: {
      latitude: -23.568,
      longitude: -46.531,
      nomeEndereco: "Rua Doutor Gabriel de Resende, 122 - Vila Invernada, São Paulo - SP"
    },
    linkSite: "https://amigosdobem.org/",
    linkInstagram: "https://www.instagram.com/amigosdobem/",
    categorias: ["combate à fome", "educação", "assistência social"]
  },
  {
    titulo: "AACD",
    imagem: "https://placehold.co/800x600?text=AACD",
    descricao:
      "Associação sem fins lucrativos fundada em 1950 dedicada a tratar, reabilitar e reintegrar à sociedade crianças, adolescentes e adultos com deficiência física, referência nacional em reabilitação.",
    comoAjudar: "Doações financeiras, doação da nota fiscal paulista, participação no Teleton e voluntariado.",
    impactosRealizados:
      "Mais de 70 anos de atuação, com milhões de atendimentos de reabilitação realizados em suas unidades pelo Brasil.",
    localizacao: {
      latitude: -23.5975,
      longitude: -46.6415,
      nomeEndereco: "Av. Professor Ascendino Reis, 724 - Vila Clementino, São Paulo - SP"
    },
    linkSite: "https://aacd.org.br/",
    linkInstagram: "https://www.instagram.com/aacdoficial/",
    categorias: ["saúde", "inclusão de pessoas com deficiência"]
  },
  {
    titulo: "GRAACC",
    imagem: "https://upload.wikimedia.org/wikipedia/commons/4/4f/GRAACC.png",
    descricao:
      "Instituição fundada em 1991 dedicada ao diagnóstico, tratamento e cura do câncer infantojuvenil, mantendo o Hospital do GRAACC em parceria com a UNIFESP.",
    comoAjudar: "Doações financeiras, compra de produtos solidários, doação de cabelo e voluntariado.",
    impactosRealizados:
      "Milhares de crianças e adolescentes com câncer tratados desde sua fundação, com taxa de cura acima da média nacional.",
    localizacao: {
      latitude: -23.5972,
      longitude: -46.643,
      nomeEndereco: "Rua Pedro de Toledo, 572 - Vila Clementino, São Paulo - SP"
    },
    linkSite: "https://graacc.org.br/",
    linkInstagram: "https://www.instagram.com/instagraacc/",
    categorias: ["saúde", "combate ao câncer infantil"]
  },
  {
    titulo: "Fundação SOS Mata Atlântica",
    imagem: "https://upload.wikimedia.org/wikipedia/commons/5/52/Logo_SOS_Mata_Atl%C3%A2ntica.JPG",
    descricao:
      "Organização não governamental criada em 1986 com a missão de defender a Mata Atlântica, promovendo conservação da natureza e desenvolvimento sustentável.",
    comoAjudar:
      "Doações financeiras, adoção de árvores/mudas, voluntariado em mutirões de plantio e assinatura de campanhas.",
    impactosRealizados:
      "Milhões de mudas plantadas e mapeamento anual do desmatamento do bioma Mata Atlântica desde 1985.",
    localizacao: {
      latitude: -23.5613,
      longitude: -46.6565,
      nomeEndereco: "Av. Paulista, 2073, Conjunto Nacional, Torre Horsa 1 - Bela Vista, São Paulo - SP"
    },
    linkSite: "https://www.sosma.org.br/",
    linkInstagram: "https://www.instagram.com/sosmataatlantica/",
    categorias: ["meio ambiente", "conservação"]
  },
  {
    titulo: "Gerando Falcões",
    imagem: "https://placehold.co/800x600?text=Gerando+Falc%C3%B5es",
    descricao:
      "Ecossistema de desenvolvimento social criado por Edu Lyra com a missão de levar favelas e periferias da pobreza à dignidade, atuando em rede com líderes sociais em todo o Brasil.",
    comoAjudar: "Doações financeiras, doação de itens no Bazar solidário, parcerias empresariais e voluntariado.",
    impactosRealizados:
      "Rede presente em centenas de favelas brasileiras, com programas como Favela 3D e Decolagem, buscando tirar 1 milhão de pessoas da pobreza.",
    localizacao: {
      latitude: -23.527,
      longitude: -46.3437,
      nomeEndereco: "Avenida Niterói, 96 - Cidade Kemel, Poá - SP"
    },
    linkSite: "https://www.gerandofalcoes.com/",
    linkInstagram: "https://www.instagram.com/gerandofalcoes/",
    categorias: ["assistência social", "combate à pobreza"]
  },
  {
    titulo: "WWF-Brasil",
    imagem: "https://placehold.co/800x600?text=WWF-Brasil",
    descricao:
      "Organização não governamental de conservação ambiental criada em 1996, integrante da Rede WWF, que desenvolve projetos de conservação da biodiversidade em todo o Brasil.",
    comoAjudar: "Doações financeiras recorrentes, adoção simbólica de espécies ameaçadas e campanhas de conscientização.",
    impactosRealizados:
      "Quase 3 décadas de atuação em biomas como Amazônia, Cerrado e Pantanal, com escritórios em Brasília, Manaus, Campo Grande, Rio Branco e São Paulo.",
    localizacao: {
      latitude: -15.827,
      longitude: -47.921,
      nomeEndereco: "CLS 114, Bloco D - Asa Sul, Brasília - DF"
    },
    linkSite: "https://www.wwf.org.br/",
    linkInstagram: "https://www.instagram.com/wwfbrasil/",
    categorias: ["meio ambiente", "conservação da biodiversidade"]
  },
  {
    titulo: "Instituto Ayrton Senna",
    imagem: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Instituto_Ayrton_Senna_-_Logo.png",
    descricao:
      "Centro de inovação em educação criado em 1994 a partir do legado de Ayrton Senna, dedicado a acelerar a qualidade da educação pública brasileira.",
    comoAjudar:
      "Doações financeiras, parcerias institucionais com redes de ensino e participação em programas de formação de educadores.",
    impactosRealizados:
      "Atua em milhares de escolas públicas brasileiras por meio de pesquisa, inovação pedagógica e influência em políticas públicas de educação.",
    localizacao: {
      latitude: -23.5675,
      longitude: -46.696,
      nomeEndereco: "Rua Doutor Fernandes Coelho, 85 - Pinheiros, São Paulo - SP"
    },
    linkSite: "https://institutoayrtonsenna.org.br/",
    linkInstagram: "https://www.instagram.com/institutoayrtonsenna/",
    categorias: ["educação"]
  },
  {
    titulo: "Ação da Cidadania",
    imagem: "https://placehold.co/800x600?text=A%C3%A7%C3%A3o+da+Cidadania",
    descricao:
      "Maior entidade de combate à fome do Brasil, fundada em 1993 pelo sociólogo Herbert de Souza (Betinho), atuando também em educação e geração de renda.",
    comoAjudar: "Doações de alimentos e financeiras, campanhas do Natal Sem Fome e voluntariado.",
    impactosRealizados:
      "Mobiliza a sociedade brasileira desde 1993 no combate à fome, com atuação consolidada em diversos estados por meio de comitês locais.",
    localizacao: {
      latitude: -22.8956,
      longitude: -43.1812,
      nomeEndereco: "Avenida Barão de Tefé, Armazém 8 - Zona Portuária, Rio de Janeiro - RJ"
    },
    linkSite: "https://www.acaodacidadania.org.br/",
    linkInstagram: "https://www.instagram.com/acaodacidadania/",
    categorias: ["combate à fome", "assistência social"]
  }
];

async function seed() {
  await connectDB();

  for (const ongData of ongsSeed) {
    // Usamos documentos (create/save) em vez de findOneAndUpdate para que o hook
    // pre("validate") do model recalcule `localizacaoGeo` (necessário para o índice
    // 2dsphere usado na busca por proximidade) — esse hook não é executado em updates
    // via query (findOneAndUpdate).
    const existente = await Ong.findOne({ titulo: ongData.titulo });

    if (existente) {
      existente.set(ongData);
      await existente.save();
    } else {
      await Ong.create(ongData);
    }

    console.log(`✅ ${ongData.titulo}`);
  }

  await mongoose.disconnect();
  console.log(`🌱 Seed concluído (${ongsSeed.length} ONGs).`);
}

seed().catch((error) => {
  console.error("❌ Erro ao popular ONGs", error);
  process.exit(1);
});
