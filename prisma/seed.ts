import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL nao definido");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // ==================== EMPRESA ====================
  await prisma.empresa.upsert({
    where: { id: "default" },
    update: {
      configuracaoScore: {
        scoreMinimo: 40,
        faixas: { A: [80, 100], B: [60, 79], C: [40, 59], D: [0, 39] },
        recomendacoes: { A: "avancar", B: "acompanhar", C: "acompanhar", D: "descartar" },
      },
    },
    create: {
      id: "default",
      nome: "Multiteiner",
      descricao: "Soluções em contêineres e equipamentos portuários",
      segmento: "Contêineres e Equipamentos Portuários",
      configuracaoScore: {
        scoreMinimo: 40,
        faixas: { A: [80, 100], B: [60, 79], C: [40, 59], D: [0, 39] },
        recomendacoes: { A: "avancar", B: "acompanhar", C: "acompanhar", D: "descartar" },
      },
    },
  });

  // ==================== KANBAN FASE 2 (RESET) ====================
  await prisma.movimentacao.deleteMany({});
  await prisma.kanbanCard.deleteMany({});
  await prisma.kanbanColuna.deleteMany({});

  const colunasFase2 = [
    { nome: "Captação", ordem: 0, cor: "#6B7280", tipo: "inicial" },
    { nome: "Qualificação", ordem: 1, cor: "#F59E0B", tipo: "normal" },
    { nome: "Análise", ordem: 2, cor: "#3B82F6", tipo: "normal" },
    { nome: "Proposta", ordem: 3, cor: "#8B5CF6", tipo: "normal" },
    { nome: "Disputa", ordem: 4, cor: "#06B6D4", tipo: "normal" },
    { nome: "Pós-resultado", ordem: 5, cor: "#10B981", tipo: "final_positivo" },
  ];

  for (const col of colunasFase2) {
    await prisma.kanbanColuna.create({ data: col });
  }

  // ==================== USUARIO ADMIN ====================
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@kanbamlicita.com" },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: "admin@kanbamlicita.com",
        name: "Administrador",
        senha: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    });
  }

  // ==================== PARÂMETROS ESTRATÉGICOS ====================
  await prisma.parametroEstrategico.deleteMany({});

  const parametros = [
    // Segmentos
    { categoria: "segmento" as const, chave: "conteineres-maritimos", valor: "Contêineres Marítimos", ordem: 0 },
    { categoria: "segmento" as const, chave: "equipamentos-portuarios", valor: "Equipamentos Portuários", ordem: 1 },
    { categoria: "segmento" as const, chave: "logistica-transporte", valor: "Logística e Transporte", ordem: 2 },
    { categoria: "segmento" as const, chave: "armazenagem", valor: "Armazenagem", ordem: 3 },

    // Palavras-chave positivas
    { categoria: "palavra_chave_positiva" as const, chave: "conteiner", valor: "contêiner", peso: 10, ordem: 0 },
    { categoria: "palavra_chave_positiva" as const, chave: "container", valor: "container", peso: 10, ordem: 1 },
    { categoria: "palavra_chave_positiva" as const, chave: "reefer", valor: "reefer", peso: 8, ordem: 2 },
    { categoria: "palavra_chave_positiva" as const, chave: "dry", valor: "dry", peso: 6, ordem: 3 },
    { categoria: "palavra_chave_positiva" as const, chave: "equipamento-portuario", valor: "equipamento portuário", peso: 9, ordem: 4 },
    { categoria: "palavra_chave_positiva" as const, chave: "reach-stacker", valor: "reach stacker", peso: 8, ordem: 5 },
    { categoria: "palavra_chave_positiva" as const, chave: "empilhadeira", valor: "empilhadeira", peso: 7, ordem: 6 },
    { categoria: "palavra_chave_positiva" as const, chave: "spreader", valor: "spreader", peso: 8, ordem: 7 },
    { categoria: "palavra_chave_positiva" as const, chave: "guindaste", valor: "guindaste", peso: 7, ordem: 8 },
    { categoria: "palavra_chave_positiva" as const, chave: "portico", valor: "pórtico", peso: 7, ordem: 9 },
    { categoria: "palavra_chave_positiva" as const, chave: "munck", valor: "munck", peso: 6, ordem: 10 },
    { categoria: "palavra_chave_positiva" as const, chave: "plataforma", valor: "plataforma", peso: 5, ordem: 11 },
    { categoria: "palavra_chave_positiva" as const, chave: "icamento", valor: "içamento", peso: 6, ordem: 12 },

    // Palavras-chave negativas
    { categoria: "palavra_chave_negativa" as const, chave: "alimentacao", valor: "alimentação", peso: -10, ordem: 0 },
    { categoria: "palavra_chave_negativa" as const, chave: "medicamento", valor: "medicamento", peso: -10, ordem: 1 },
    { categoria: "palavra_chave_negativa" as const, chave: "veiculo-automotor", valor: "veículo automotor", peso: -8, ordem: 2 },
    { categoria: "palavra_chave_negativa" as const, chave: "mobiliario", valor: "mobiliário", peso: -8, ordem: 3 },
    { categoria: "palavra_chave_negativa" as const, chave: "limpeza", valor: "limpeza", peso: -7, ordem: 4 },
    { categoria: "palavra_chave_negativa" as const, chave: "material-escritorio", valor: "material de escritório", peso: -7, ordem: 5 },
    { categoria: "palavra_chave_negativa" as const, chave: "uniforme", valor: "uniforme", peso: -6, ordem: 6 },
    { categoria: "palavra_chave_negativa" as const, chave: "combustivel", valor: "combustível", peso: -6, ordem: 7 },

    // Regras por modalidade
    { categoria: "regra_modalidade" as const, chave: "pregao-eletronico", valor: "Pregão Eletrônico", peso: 10, ordem: 0 },
    { categoria: "regra_modalidade" as const, chave: "concorrencia", valor: "Concorrência", peso: 5, ordem: 1 },
    { categoria: "regra_modalidade" as const, chave: "tomada-precos", valor: "Tomada de Preços", peso: 3, ordem: 2 },

    // Regras por UF (portuárias)
    { categoria: "regra_uf" as const, chave: "sp", valor: "SP", peso: 10, ordem: 0 },
    { categoria: "regra_uf" as const, chave: "rj", valor: "RJ", peso: 9, ordem: 1 },
    { categoria: "regra_uf" as const, chave: "sc", valor: "SC", peso: 9, ordem: 2 },
    { categoria: "regra_uf" as const, chave: "rs", valor: "RS", peso: 8, ordem: 3 },
    { categoria: "regra_uf" as const, chave: "pr", valor: "PR", peso: 8, ordem: 4 },
    { categoria: "regra_uf" as const, chave: "es", valor: "ES", peso: 7, ordem: 5 },
    { categoria: "regra_uf" as const, chave: "ba", valor: "BA", peso: 7, ordem: 6 },
    { categoria: "regra_uf" as const, chave: "pe", valor: "PE", peso: 6, ordem: 7 },
    { categoria: "regra_uf" as const, chave: "ce", valor: "CE", peso: 6, ordem: 8 },
    { categoria: "regra_uf" as const, chave: "pa", valor: "PA", peso: 7, ordem: 9 },
    { categoria: "regra_uf" as const, chave: "am", valor: "AM", peso: 7, ordem: 10 },
  ];

  for (const p of parametros) {
    await prisma.parametroEstrategico.create({ data: p });
  }

  // ==================== CRITÉRIOS DE SCORE ====================
  await prisma.criterioScore.deleteMany({});

  const criterios = [
    { nome: "aderencia_portfolio", descricao: "Quanto o objeto da licitação se alinha ao portfólio da empresa", tipo: "objetivo" as const, peso: 25, formulaRef: "match_palavras_chave", faixaMin: 0, faixaMax: 100, ordem: 0 },
    { nome: "valor_estimado", descricao: "Atratividade do valor estimado da licitação", tipo: "objetivo" as const, peso: 15, formulaRef: "faixa_valor", faixaMin: 0, faixaMax: 100, ordem: 1 },
    { nome: "modalidade_favoravel", descricao: "Se a modalidade é favorável para a empresa", tipo: "objetivo" as const, peso: 15, formulaRef: "match_modalidade", faixaMin: 0, faixaMax: 100, ordem: 2 },
    { nome: "uf_estrategica", descricao: "Se a UF está na lista de UFs estratégicas da empresa", tipo: "objetivo" as const, peso: 10, formulaRef: "match_uf", faixaMin: 0, faixaMax: 100, ordem: 3 },
    { nome: "prazo_viavel", descricao: "Se há tempo hábil para preparar proposta", tipo: "objetivo" as const, peso: 10, formulaRef: "dias_ate_sessao", faixaMin: 0, faixaMax: 100, ordem: 4 },
    { nome: "complexidade", descricao: "Nível de complexidade documental e operacional", tipo: "subjetivo" as const, peso: 10, faixaMin: 0, faixaMax: 100, ordem: 5 },
    { nome: "historico_orgao", descricao: "Experiência prévia com o órgão licitante", tipo: "subjetivo" as const, peso: 15, faixaMin: 0, faixaMax: 100, ordem: 6 },
  ];

  for (const c of criterios) {
    await prisma.criterioScore.create({ data: c });
  }

  // ==================== REGRAS DE ADERÊNCIA ====================
  await prisma.regraAderencia.deleteMany({});

  const regras = [
    { nome: "Incluir Pregão Eletrônico", tipo: "inclusao" as const, campo: "modalidade", operador: "contem" as const, valor: "Pregão Eletrônico", peso: 20, descricao: "Modalidade mais frequente e com melhor taxa de sucesso" },
    { nome: "Excluir Convite", tipo: "exclusao" as const, campo: "modalidade", operador: "igual" as const, valor: "Convite", peso: -30, descricao: "Modalidade restrita, geralmente não compensa" },
    { nome: "Incluir UFs portuárias", tipo: "inclusao" as const, campo: "uf", operador: "contem" as const, valor: "SP,RJ,SC,RS,PR,ES,BA,PE,CE,PA,AM", peso: 15, descricao: "UFs com portos ativos e demanda para contêineres" },
    { nome: "Excluir alimentação no objeto", tipo: "exclusao" as const, campo: "objeto", operador: "contem" as const, valor: "alimentação", peso: -50, descricao: "Objeto totalmente fora do portfólio" },
  ];

  for (const r of regras) {
    await prisma.regraAderencia.create({ data: r });
  }

  // ==================== FONTE PNCP (SP-B) ====================
  await prisma.fonteCaptacao.upsert({
    where: { id: "fonte-pncp-default" },
    update: {},
    create: {
      id: "fonte-pncp-default",
      nome: "PNCP - Contêineres e Equipamentos",
      tipo: "pncp",
      ativo: true,
      filtros: {
        palavrasChave: ["contêiner", "container", "equipamento portuário", "reach stacker", "empilhadeira"],
        ufs: ["SP", "RJ", "SC", "RS", "PR", "ES"],
      },
      parametros: {
        tamanhoPagina: 50,
        paginasMaximas: 3,
      },
      periodicidade: "12h",
    },
  });

  // ==================== FONTE PETRONECT (SP-B) ====================
  // Credenciais devem vir de variáveis de ambiente. Sem elas, a fonte não é criada
  // — usuário pode configurar manualmente em Configurações → Fontes de Captação.
  const petronectUser = process.env.PETRONECT_USERNAME;
  const petronectPass = process.env.PETRONECT_PASSWORD;
  if (petronectUser && petronectPass) {
    await prisma.fonteCaptacao.upsert({
      where: { id: "fonte-petronect-default" },
      update: {},
      create: {
        id: "fonte-petronect-default",
        nome: "Petronect - Contêineres e Equipamentos",
        tipo: "petronect",
        ativo: true,
        filtros: {
          palavrasChave: ["contêiner", "container", "equipamento portuário", "reach stacker", "empilhadeira"],
        },
        parametros: {
          username: petronectUser,
          password: petronectPass,
        },
        periodicidade: "12h",
      },
    });
  } else {
    console.log("[seed] PETRONECT_USERNAME/PETRONECT_PASSWORD ausentes — fonte Petronect não criada.");
  }

  console.log("Seed Fase 2 concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
