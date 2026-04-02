import { db } from "@/lib/db";
import { getIaProvider } from "@/lib/ia/factory";
import {
  buscarDetalhesPncp,
  listarArquivosPncp,
  baixarArquivoPncp,
  parseNumeroControle,
} from "@/lib/pncp/detalhes";
import {
  SYSTEM_ANALISE_PROFUNDA,
  buildPromptAnaliseProfunda,
} from "./prompt";
import type { ResumoLicitacaoData, StatusAnaliseProfunda } from "./types";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Importa pdf-parse de forma dinâmica para evitar problemas de build
async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Atualiza o status da análise profunda na AcaoIa.
 */
async function atualizarStatus(
  acaoId: string,
  status: StatusAnaliseProfunda,
  extra?: { resposta?: string; respostaJson?: unknown; erro?: string }
) {
  await db.acaoIa.update({
    where: { id: acaoId },
    data: {
      status: status === "concluido" ? "concluido" : status === "erro" ? "erro" : "processando",
      resposta: extra?.resposta ?? undefined,
      respostaJson: extra?.respostaJson as InputJsonValue ?? undefined,
      erro: extra?.erro ?? undefined,
    },
  });
}

/**
 * Extrai o numero_controle_pncp dos dados da licitação.
 */
function extrairNumeroControle(licitacao: {
  dadosExtraidos?: Record<string, unknown> | null;
  linkOrigem?: string | null;
}): string | null {
  // Tentar do dadosExtraidos
  const dados = licitacao.dadosExtraidos;
  if (dados && typeof dados === "object") {
    const raw = dados as Record<string, unknown>;
    if (typeof raw.numeroControlePNCP === "string") return raw.numeroControlePNCP;
    if (typeof raw.numeroControlePncpCompra === "string") return raw.numeroControlePncpCompra;
  }

  // Tentar do linkOrigem (pncp-contrato:XXXX)
  const link = licitacao.linkOrigem ?? "";
  const match = link.match(/pncp-contrato:(.+)/);
  if (match) return match[1];

  // Tentar extrair de URL do PNCP
  const urlMatch = link.match(/editais\/(.+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

/**
 * Pipeline principal da análise profunda.
 * Roda em background (fire-and-forget).
 */
export async function executarAnaliseProfunda(
  licitacaoId: string
): Promise<void> {
  // Criar registro de AcaoIa para tracking
  const acao = await db.acaoIa.create({
    data: {
      licitacaoId,
      tipo: "analise_profunda",
      status: "processando",
      prompt: "Análise profunda automática com download de documentos",
    },
  });

  try {
    // ── 1. Buscar dados da licitação ──
    await atualizarStatus(acao.id, "buscando_detalhes");

    const licitacao = await db.licitacao.findUnique({
      where: { id: licitacaoId },
      include: { documentos: true },
    });

    if (!licitacao) {
      await atualizarStatus(acao.id, "erro", { erro: "Licitação não encontrada" });
      return;
    }

    const numeroControle = extrairNumeroControle({
      dadosExtraidos: licitacao.dadosExtraidos as Record<string, unknown> | null,
      linkOrigem: licitacao.linkOrigem,
    });
    let detalhesPncp: Record<string, unknown> | null = null;
    let urlItem: string | undefined;

    // Extrair URL do item dos dados extraídos
    const dados = licitacao.dadosExtraidos as Record<string, unknown> | null;

    if (numeroControle) {
      // ── 2. Buscar detalhes completos no PNCP ──
      detalhesPncp = await buscarDetalhesPncp(numeroControle, urlItem);
    }

    // ── 3. Baixar documentos anexos ──
    await atualizarStatus(acao.id, "baixando_documentos");

    const textosDocumentos: { nome: string; texto: string }[] = [];
    const documentosAnalisados: string[] = [];

    if (numeroControle) {
      const arquivos = await listarArquivosPncp(numeroControle, urlItem);

      // Limitar a 10 documentos para não demorar demais
      const arquivosParaBaixar = arquivos.slice(0, 10);

      for (const arq of arquivosParaBaixar) {
        try {
          const download = await baixarArquivoPncp(
            numeroControle,
            arq.sequencialDocumento
          );

          if (!download) continue;

          const nomeArq = arq.titulo || `documento_${arq.sequencialDocumento}`;
          documentosAnalisados.push(nomeArq);

          // Salvar arquivo no disco
          const uploadDir = join(
            process.cwd(),
            "uploads",
            "pncp",
            licitacaoId
          );
          await mkdir(uploadDir, { recursive: true });

          const extensao = download.contentType.includes("pdf")
            ? ".pdf"
            : download.contentType.includes("doc")
            ? ".docx"
            : "";
          const nomeArquivo = `${arq.sequencialDocumento}${extensao}`;
          const caminhoCompleto = join(uploadDir, nomeArquivo);
          await writeFile(caminhoCompleto, download.buffer);

          // Salvar referência no banco
          await db.documento.create({
            data: {
              licitacaoId,
              nome: nomeArq,
              nomeOriginal: nomeArq,
              tipo: arq.tipoDocumentoNome ?? arq.tipoDocumento ?? "outro",
              tamanho: download.tamanho,
              mimeType: download.contentType,
              caminho: `uploads/pncp/${licitacaoId}/${nomeArquivo}`,
            },
          });

          // Extrair texto de PDFs
          if (download.contentType.includes("pdf")) {
            try {
              const texto = await parsePdf(download.buffer);
              if (texto.trim()) {
                textosDocumentos.push({ nome: nomeArq, texto });
              }
            } catch {
              // PDF pode estar protegido ou corrompido
              documentosAnalisados.push(`${nomeArq} (PDF não legível)`);
            }
          }
        } catch {
          // Continuar com próximo documento se um falhar
        }
      }
    }

    // ── 4. Analisar com IA ──
    await atualizarStatus(acao.id, "analisando_ia");

    // Buscar produtos da empresa para contexto
    const produtos = await db.produto.findMany({
      where: { ativo: true },
      select: { nome: true, descricao: true, categoria: true },
    });

    const ia = await getIaProvider();

    const prompt = buildPromptAnaliseProfunda({
      dadosLicitacao: {
        titulo: licitacao.titulo,
        orgao: licitacao.orgao,
        objeto: licitacao.objeto,
        modalidade: licitacao.modalidade,
        uf: licitacao.uf,
        municipio: licitacao.municipio,
        valorEstimado: licitacao.valorEstimado?.toString(),
        dataPublicacao: licitacao.dataPublicacao?.toISOString(),
        dataSessao: licitacao.dataSessao?.toISOString(),
        dadosExtraidos: licitacao.dadosExtraidos as Record<string, unknown>,
      },
      detalhesPncp,
      textosDocumentos,
      produtos,
    });

    const respostaTexto = await ia.complete(SYSTEM_ANALISE_PROFUNDA, prompt);

    // Tentar parsear JSON
    let resumoJson: ResumoLicitacaoData | null = null;
    try {
      // Limpar possíveis wrappers de markdown
      const limpo = respostaTexto
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      resumoJson = JSON.parse(limpo);

      // Adicionar metadados
      if (resumoJson) {
        resumoJson.analisadoEm = new Date().toISOString();
        resumoJson.modelo = ia.modelName;
        resumoJson.documentosAnalisados = documentosAnalisados;
      }
    } catch {
      // Se não conseguiu parsear, salvar como texto
    }

    // ── 5. Salvar resultado ──
    await atualizarStatus(acao.id, "concluido", {
      resposta: respostaTexto,
      respostaJson: resumoJson as unknown as InputJsonValue,
    });

    // Atualizar modelo usado
    await db.acaoIa.update({
      where: { id: acao.id },
      data: { modelo: ia.modelName },
    });

    console.log(
      `[analise-profunda] Licitação ${licitacaoId}: concluída. ` +
        `${documentosAnalisados.length} docs, modelo: ${ia.modelName}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido na análise profunda";
    console.error(`[analise-profunda] Erro licitação ${licitacaoId}:`, msg);
    await atualizarStatus(acao.id, "erro", { erro: msg });
  }
}
