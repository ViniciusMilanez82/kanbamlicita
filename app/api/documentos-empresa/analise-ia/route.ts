import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { getIaProvider } from "@/lib/ia/factory";

// POST — análise IA dos documentos: verifica vencimentos e sugere alertas/ações
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  // Buscar todos os documentos ativos com validade
  const documentos = await db.documentoEmpresa.findMany({
    where: { status: { not: "substituido" } },
    select: {
      id: true,
      cnpj: true,
      categoria: true,
      tipoDocumento: true,
      dataEmissao: true,
      dataValidade: true,
      status: true,
      nivelAlerta: true,
      versao: true,
      orgaoEmissor: true,
    },
    orderBy: { dataValidade: "asc" },
  });

  // Buscar configs de alerta existentes
  const configsExistentes = await db.configuracaoAlertaDoc.findMany();
  const tiposComConfig = new Set(configsExistentes.map((c) => c.tipoDocumento));

  // Montar contexto para a IA
  const hoje = new Date();
  const docResumo = documentos.map((d) => {
    const diasRestantes = d.dataValidade
      ? Math.ceil(
          (d.dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;
    return {
      tipo: d.tipoDocumento,
      categoria: d.categoria,
      cnpj: d.cnpj,
      emissao: d.dataEmissao?.toISOString().slice(0, 10) ?? "sem data",
      validade: d.dataValidade?.toISOString().slice(0, 10) ?? "sem validade",
      diasRestantes,
      status: d.status,
      nivelAlerta: d.nivelAlerta,
      versao: d.versao,
      orgaoEmissor: d.orgaoEmissor ?? "não informado",
      temConfigAlerta: tiposComConfig.has(d.tipoDocumento),
    };
  });

  const tiposSemConfig = [
    ...new Set(
      documentos
        .map((d) => d.tipoDocumento)
        .filter((t) => !tiposComConfig.has(t))
    ),
  ];

  const systemPrompt = `Você é um especialista em gestão documental para licitações públicas no Brasil (Lei 14.133/2021).
Analise o acervo documental da empresa e forneça um diagnóstico completo com recomendações práticas.

IMPORTANTE: Responda SEMPRE em JSON válido seguindo exatamente esta estrutura:
{
  "diagnostico": {
    "score_saude": <número 0-100>,
    "resumo": "<texto curto do estado geral>",
    "riscos_criticos": ["<risco 1>", "<risco 2>"]
  },
  "documentos_atencao": [
    {
      "tipoDocumento": "<nome>",
      "cnpj": "<cnpj>",
      "situacao": "vencido|vencendo|ausente_provavel",
      "diasRestantes": <número ou null>,
      "acao_recomendada": "<o que fazer>",
      "prioridade": "critica|alta|media|baixa",
      "orgao_emissao": "<onde renovar>",
      "prazo_emissao_estimado": "<ex: imediato, 1-3 dias úteis>"
    }
  ],
  "alertas_sugeridos": [
    {
      "tipoDocumento": "<nome do tipo>",
      "diasVerde": <num>,
      "diasAmarelo": <num>,
      "diasLaranja": <num>,
      "diasVermelho": <num>,
      "diasPreto": 0,
      "justificativa": "<por que estes thresholds>"
    }
  ],
  "documentos_faltantes": [
    {
      "tipoDocumento": "<nome>",
      "categoria": "<juridica|fiscal|trabalhista|tecnica|economica|complementar>",
      "obrigatoriedade": "obrigatório em quase todos os editais|frequentemente exigido|situacional",
      "como_obter": "<instrução prática>"
    }
  ],
  "recomendacoes_gerais": ["<recomendação 1>", "<recomendação 2>"]
}`;

  const userPrompt = `Data atual: ${hoje.toISOString().slice(0, 10)}

DOCUMENTOS CADASTRADOS (${documentos.length} total):
${JSON.stringify(docResumo, null, 2)}

TIPOS SEM CONFIGURAÇÃO DE ALERTA: ${tiposSemConfig.length > 0 ? tiposSemConfig.join(", ") : "nenhum — todos já têm configuração"}

CONFIGURAÇÕES DE ALERTA EXISTENTES:
${JSON.stringify(
  configsExistentes.map((c) => ({
    tipo: c.tipoDocumento,
    verde: c.diasVerde,
    amarelo: c.diasAmarelo,
    laranja: c.diasLaranja,
    vermelho: c.diasVermelho,
  })),
  null,
  2
)}

Analise o acervo e:
1. Dê um diagnóstico da saúde documental com score e riscos críticos
2. Liste documentos que precisam de atenção IMEDIATA (vencidos ou vencendo)
3. Sugira configurações de alerta para tipos que NÃO têm config ainda, considerando a validade típica de cada certidão brasileira (ex: FGTS=30 dias precisa thresholds menores, CND Federal=180 dias pode ter thresholds maiores)
4. Identifique documentos OBRIGATÓRIOS para licitações que podem estar FALTANDO no acervo (baseado nas categorias de habilitação da Lei 14.133/2021: jurídica, fiscal, trabalhista, técnica, econômica)
5. Dê recomendações gerais para manter a empresa sempre pronta para licitar`;

  try {
    const ia = await getIaProvider();
    const resposta = await ia.complete(systemPrompt, userPrompt);

    // Tentar extrair JSON da resposta
    let analise;
    try {
      // Tentar parse direto
      analise = JSON.parse(resposta);
    } catch {
      // Tentar extrair JSON de bloco markdown
      const jsonMatch = resposta.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[1].trim());
      } else {
        // Tentar encontrar primeiro { e último }
        const start = resposta.indexOf("{");
        const end = resposta.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          analise = JSON.parse(resposta.slice(start, end + 1));
        } else {
          throw new Error("Resposta da IA não contém JSON válido");
        }
      }
    }

    return NextResponse.json({
      analise,
      modelo: ia.modelName,
      totalDocumentos: documentos.length,
      tiposSemConfig,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na análise de IA";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
