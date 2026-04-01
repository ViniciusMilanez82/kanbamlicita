import { db } from "@/lib/db";

/**
 * Verifica documentos da empresa que estão vencendo ou vencidos
 * e cria notificações in-app. Evita duplicatas dentro de 24h.
 */
export async function verificarDocumentosVencendo(): Promise<void> {
  const docs = await db.documentoEmpresa.findMany({
    where: {
      status: { in: ["vencendo", "vencido"] },
      dataValidade: { not: null },
    },
    select: {
      id: true,
      tipoDocumento: true,
      cnpj: true,
      dataValidade: true,
      nivelAlerta: true,
      status: true,
    },
  });

  if (docs.length === 0) return;

  const agora = new Date();
  const limite24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

  for (const doc of docs) {
    // Verificar se já notificou nas últimas 24h
    const jaNotificou = await db.notificacao.findFirst({
      where: {
        tipo: { in: ["documento_vencendo", "documento_vencido"] },
        mensagem: { contains: doc.id },
        criadoEm: { gte: limite24h },
      },
    });

    if (jaNotificou) continue;

    const diasRestantes = doc.dataValidade
      ? Math.ceil(
          (doc.dataValidade.getTime() - agora.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    const tipo =
      doc.status === "vencido" ? "documento_vencido" : "documento_vencendo";

    const titulo =
      doc.status === "vencido"
        ? `${doc.tipoDocumento} VENCIDO`
        : `${doc.tipoDocumento} vence em ${diasRestantes} dias`;

    const mensagem =
      doc.status === "vencido"
        ? `O documento "${doc.tipoDocumento}" (CNPJ ${doc.cnpj}) está vencido. Renove imediatamente. [docId:${doc.id}]`
        : `O documento "${doc.tipoDocumento}" (CNPJ ${doc.cnpj}) vence em ${diasRestantes} dia(s). [docId:${doc.id}]`;

    await db.notificacao.create({
      data: { tipo, titulo, mensagem },
    });
  }
}
