import { db } from "@/lib/db";
import type { NivelAlerta, ConfiguracaoAlertaDoc } from "@/lib/generated/prisma/client";

/** Thresholds padrão quando não há configuração específica */
const CONFIG_PADRAO = {
  diasVerde: 90,
  diasAmarelo: 60,
  diasLaranja: 30,
  diasVermelho: 15,
  diasPreto: 0,
};

/**
 * Calcula o nível de alerta baseado nos dias restantes até o vencimento.
 * Retorna null se não houver data de validade.
 */
export function calcularNivelAlerta(
  dataValidade: Date | null,
  config?: Pick<ConfiguracaoAlertaDoc, "diasVerde" | "diasAmarelo" | "diasLaranja" | "diasVermelho" | "diasPreto"> | null
): NivelAlerta | null {
  if (!dataValidade) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);

  const diasRestantes = Math.ceil(
    (validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );

  const c = config ?? CONFIG_PADRAO;

  if (diasRestantes <= c.diasPreto) return "preto";
  if (diasRestantes <= c.diasVermelho) return "vermelho";
  if (diasRestantes <= c.diasLaranja) return "laranja";
  if (diasRestantes <= c.diasAmarelo) return "amarelo";
  return "verde";
}

/**
 * Calcula o status do documento baseado no nível de alerta.
 */
export function statusPorAlerta(
  nivel: NivelAlerta | null
): "vigente" | "vencendo" | "vencido" {
  if (!nivel) return "vigente"; // sem validade = sempre vigente
  if (nivel === "preto") return "vencido";
  if (nivel === "vermelho" || nivel === "laranja" || nivel === "amarelo")
    return "vencendo";
  return "vigente";
}

/**
 * Batch job: recalcula nivelAlerta e status de todos os documentos vigentes/vencendo.
 * Chamado pelo scheduler periodicamente.
 */
export async function atualizarAlertasTodosDocumentos(): Promise<{
  atualizados: number;
}> {
  // Buscar documentos ativos (não substituídos) que têm data de validade
  const docs = await db.documentoEmpresa.findMany({
    where: {
      status: { in: ["vigente", "vencendo", "vencido"] },
      dataValidade: { not: null },
    },
    select: {
      id: true,
      tipoDocumento: true,
      dataValidade: true,
      nivelAlerta: true,
      status: true,
    },
  });

  if (docs.length === 0) return { atualizados: 0 };

  // Carregar configs de alerta por tipo
  const configs = await db.configuracaoAlertaDoc.findMany();
  const configMap = new Map(configs.map((c) => [c.tipoDocumento, c]));

  let atualizados = 0;

  for (const doc of docs) {
    const config = configMap.get(doc.tipoDocumento) ?? null;
    const novoNivel = calcularNivelAlerta(doc.dataValidade, config);
    const novoStatus = statusPorAlerta(novoNivel);

    if (novoNivel !== doc.nivelAlerta || novoStatus !== doc.status) {
      await db.documentoEmpresa.update({
        where: { id: doc.id },
        data: { nivelAlerta: novoNivel, status: novoStatus },
      });
      atualizados++;
    }
  }

  return { atualizados };
}
