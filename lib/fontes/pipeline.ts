import { db } from "@/lib/db";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { criarConector } from "./factory";
import type { FonteConfig, ResultadoConector } from "./types";
import type { FiltrosFonte, ParametrosFonte } from "./types";
import { avaliarEPersistir } from "@/lib/aderencia/pipeline-hook";

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export async function executarCaptacao(
  fonteId: string,
  disparadoPor: string
): Promise<{ execucaoId: string }> {
  // 1. Buscar fonte
  const fonte = await db.fonteCaptacao.findUnique({ where: { id: fonteId } });
  if (!fonte) throw new Error("Fonte não encontrada");
  if (!fonte.ativo) throw new Error("Fonte inativa");

  // 2. Criar execução
  const execucao = await db.execucaoCaptacao.create({
    data: {
      fonteId,
      status: "executando",
      disparadoPor,
    },
  });

  // 3. Executar em background (não bloqueia o response)
  executarPipeline(fonte, execucao.id).catch((err) => {
    console.error(`[pipeline] Erro fatal na execução ${execucao.id}:`, err);
  });

  return { execucaoId: execucao.id };
}

async function executarPipeline(
  fonte: {
    id: string;
    tipo: string;
    filtros: unknown;
    parametros: unknown;
  },
  execucaoId: string
): Promise<void> {
  const contadores = {
    totalCaptados: 0,
    totalCriados: 0,
    totalAtualizados: 0,
    totalDuplicados: 0,
    totalDescartados: 0,
    totalErros: 0,
  };

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    const conector = criarConector(fonte.tipo as Parameters<typeof criarConector>[0]);
    const fonteConfig: FonteConfig = {
      id: fonte.id,
      tipo: fonte.tipo as FonteConfig["tipo"],
      filtros: (fonte.filtros ?? {}) as FiltrosFonte,
      parametros: (fonte.parametros ?? {}) as ParametrosFonte,
    };

    // Buscar coluna inicial para novos cards
    const colunaInicial = await db.kanbanColuna.findFirst({
      where: { tipo: "inicial", ativo: true },
      orderBy: { ordem: "asc" },
    });

    if (!colunaInicial) {
      throw new Error("Nenhuma coluna inicial encontrada no Kanban");
    }

    for await (const batch of conector.buscar(fonteConfig)) {
      if (abortController.signal.aborted) {
        throw new Error("Execução cancelada por timeout (5 minutos)");
      }

      for (const item of batch) {
        contadores.totalCaptados++;
        try {
          await processarItem(item, fonte.id, execucaoId, colunaInicial.id, contadores);
        } catch (err) {
          contadores.totalErros++;
          await db.itemCaptado.create({
            data: {
              execucaoId,
              identificadorExterno: item.identificadorExterno,
              dadosBrutos: item.dadosBrutos as InputJsonValue,
              status: "erro",
              motivo: err instanceof Error ? err.message : "Erro desconhecido",
            },
          });
        }
      }

      // Atualizar contadores parciais
      await db.execucaoCaptacao.update({
        where: { id: execucaoId },
        data: contadores,
      });
    }

    // Finalizar com sucesso
    await db.execucaoCaptacao.update({
      where: { id: execucaoId },
      data: {
        ...contadores,
        status: "concluida",
        finalizadaEm: new Date(),
      },
    });

    await db.fonteCaptacao.update({
      where: { id: fonte.id },
      data: { ultimaSincronizacao: new Date() },
    });
  } catch (err) {
    await db.execucaoCaptacao.update({
      where: { id: execucaoId },
      data: {
        ...contadores,
        status: "erro",
        erro: err instanceof Error ? err.message : "Erro desconhecido",
        finalizadaEm: new Date(),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function processarItem(
  item: ResultadoConector,
  fonteId: string,
  execucaoId: string,
  colunaInicialId: string,
  contadores: {
    totalCriados: number;
    totalAtualizados: number;
    totalDuplicados: number;
  }
): Promise<void> {
  const existente = await db.licitacao.findUnique({
    where: { identificadorExterno: item.identificadorExterno },
  });

  if (!existente) {
    // Criar nova licitação + card
    const licitacao = await db.licitacao.create({
      data: {
        titulo: item.dados.titulo,
        orgao: item.dados.orgao ?? null,
        objeto: item.dados.objeto ?? null,
        modalidade: item.dados.modalidade ?? null,
        uf: item.dados.uf ?? null,
        municipio: item.dados.municipio ?? null,
        valorEstimado: item.dados.valorEstimado ?? null,
        dataPublicacao: item.dados.dataPublicacao ? new Date(item.dados.dataPublicacao) : null,
        dataSessao: item.dados.dataSessao ? new Date(item.dados.dataSessao) : null,
        linkOrigem: item.dados.linkOrigem ?? null,
        fonteId,
        identificadorExterno: item.identificadorExterno,
      },
    });

    await db.kanbanCard.create({
      data: {
        licitacaoId: licitacao.id,
        colunaId: colunaInicialId,
        ordem: 0,
      },
    });

    await db.itemCaptado.create({
      data: {
        execucaoId,
        identificadorExterno: item.identificadorExterno,
        dadosBrutos: item.dadosBrutos as InputJsonValue,
        status: "criado",
        licitacaoId: licitacao.id,
      },
    });

    contadores.totalCriados++;

    // Avaliar aderencia automatica
    avaliarEPersistir(licitacao.id).catch(() => {});
    return;
  }

  // Verificar se houve mudanças
  const camposAComparar = {
    titulo: item.dados.titulo,
    objeto: item.dados.objeto ?? null,
    valorEstimado: item.dados.valorEstimado ?? null,
    dataPublicacao: item.dados.dataPublicacao ? new Date(item.dados.dataPublicacao).toISOString() : null,
    dataSessao: item.dados.dataSessao ? new Date(item.dados.dataSessao).toISOString() : null,
    modalidade: item.dados.modalidade ?? null,
  };

  const mudancas: Record<string, unknown> = {};
  for (const [campo, valorNovo] of Object.entries(camposAComparar)) {
    if (valorNovo == null) continue;
    const valorAtual = (existente as Record<string, unknown>)[campo];
    const atualStr = valorAtual instanceof Date ? valorAtual.toISOString() : String(valorAtual ?? "");
    const novoStr = String(valorNovo);
    if (atualStr !== novoStr) {
      if (campo === "valorEstimado") {
        mudancas[campo] = valorNovo;
      } else if (campo === "dataPublicacao" || campo === "dataSessao") {
        mudancas[campo] = new Date(valorNovo as string);
      } else {
        mudancas[campo] = valorNovo;
      }
    }
  }

  if (Object.keys(mudancas).length > 0) {
    await db.licitacao.update({
      where: { id: existente.id },
      data: mudancas,
    });

    await db.itemCaptado.create({
      data: {
        execucaoId,
        identificadorExterno: item.identificadorExterno,
        dadosBrutos: item.dadosBrutos as InputJsonValue,
        status: "atualizado",
        licitacaoId: existente.id,
      },
    });

    contadores.totalAtualizados++;

    // Re-avaliar aderencia apos atualizacao
    avaliarEPersistir(existente.id).catch(() => {});
    return;
  }

  // Sem mudanças — duplicado
  await db.itemCaptado.create({
    data: {
      execucaoId,
      identificadorExterno: item.identificadorExterno,
      dadosBrutos: item.dadosBrutos as InputJsonValue,
      status: "duplicado",
      licitacaoId: existente.id,
    },
  });

  contadores.totalDuplicados++;
}
