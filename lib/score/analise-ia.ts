import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { getIaProvider } from "@/lib/ia/factory";
import type { AnaliseIaResultado } from "./types";

const SYSTEM_PROMPT = `Você é um analista especializado em licitações públicas brasileiras, avaliando oportunidades para uma empresa de contêineres e equipamentos portuários.

Analise a licitação fornecida e retorne um JSON com a seguinte estrutura exata:

{
  "aderenciaDiretaExiste": boolean,
  "aderenciaDiretaNivel": "alta" | "media" | "baixa" | "nenhuma",
  "aderenciaDiretaJustificativa": "string",
  "aderenciaAplicacaoExiste": boolean,
  "aderenciaAplicacaoNivel": "alta" | "media" | "baixa" | "nenhuma",
  "aderenciaAplicacaoJustificativa": "string",
  "contextoOcultoExiste": boolean,
  "contextoOcultoNivel": "alta" | "media" | "baixa" | "nenhuma",
  "contextoOcultoJustificativa": "string",
  "oportunidadeOcultaExiste": boolean,
  "oportunidadeOcultaForca": "alta" | "media" | "baixa" | "nenhuma",
  "oportunidadeOcultaResumo": "string",
  "oportunidadeNoObjeto": boolean,
  "oportunidadeNoTr": boolean,
  "oportunidadeNosLotes": boolean,
  "oportunidadeNosItens": boolean,
  "oportunidadeNaPlanilha": boolean,
  "oportunidadeNoMemorial": boolean,
  "oportunidadeEmAnexoTecnico": boolean
}

Critérios:
- Aderência direta: o objeto da licitação menciona explicitamente produtos/serviços do portfólio da empresa?
- Aderência por aplicação: mesmo sem menção direta, os produtos da empresa poderiam ser aplicados?
- Contexto oculto: há indícios no texto que sugerem necessidade dos produtos da empresa sem menção explícita?
- Oportunidade oculta: há oportunidade escondida em lotes, itens ou anexos?
- Flags de oportunidade: marque onde exatamente a oportunidade foi encontrada.

Retorne APENAS o JSON, sem texto adicional.`;

function buildUserPrompt(
  licitacao: { titulo: string; orgao?: string | null; objeto?: string | null; modalidade?: string | null; uf?: string | null; valorEstimado?: unknown },
  empresa: { nome: string; descricao?: string | null; segmento?: string | null },
  produtos: Array<{ nome: string; descricao?: string | null; categoria?: string | null }>
): string {
  const produtosStr = produtos.length > 0
    ? produtos.map((p) => `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ""}${p.descricao ? `: ${p.descricao}` : ""}`).join("\n")
    : "Nenhum produto cadastrado";

  return `## Empresa
Nome: ${empresa.nome}
Segmento: ${empresa.segmento ?? "Não informado"}
Descrição: ${empresa.descricao ?? "Não informada"}

## Produtos/Serviços
${produtosStr}

## Licitação
Título: ${licitacao.titulo}
Órgão: ${licitacao.orgao ?? "Não informado"}
Modalidade: ${licitacao.modalidade ?? "Não informada"}
UF: ${licitacao.uf ?? "Não informada"}
Valor estimado: ${licitacao.valorEstimado ? `R$ ${Number(licitacao.valorEstimado).toLocaleString("pt-BR")}` : "Não informado"}

Objeto:
${licitacao.objeto ?? "Não informado"}`;
}

export async function analisarComIa(licitacaoId: string): Promise<void> {
  // Criar/atualizar registro como "processando"
  await db.licitacaoAnaliseIa.upsert({
    where: { licitacaoId },
    update: { status: "processando", erro: null, resultadoJson: Prisma.JsonNull },
    create: { licitacaoId, status: "processando" },
  });

  try {
    const licitacao = await db.licitacao.findUniqueOrThrow({
      where: { id: licitacaoId },
    });

    const empresa = await db.empresa.findUniqueOrThrow({
      where: { id: "default" },
    });

    const produtos = await db.produto.findMany({
      where: { empresaId: "default", ativo: true },
      select: { nome: true, descricao: true, categoria: true },
    });

    const ia = await getIaProvider();
    const userPrompt = buildUserPrompt(licitacao, empresa, produtos);
    const resposta = await ia.complete(SYSTEM_PROMPT, userPrompt);

    // Extrair JSON da resposta
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("A IA não retornou um JSON válido");
    }

    const resultado = JSON.parse(jsonMatch[0]) as AnaliseIaResultado;

    await db.licitacaoAnaliseIa.update({
      where: { licitacaoId },
      data: {
        status: "concluido",
        resultadoJson: resultado as Prisma.InputJsonValue,
        modelo: ia.modelName,
      },
    });
  } catch (err) {
    await db.licitacaoAnaliseIa.update({
      where: { licitacaoId },
      data: {
        status: "erro",
        erro: err instanceof Error ? err.message : "Erro desconhecido",
      },
    });
  }
}
