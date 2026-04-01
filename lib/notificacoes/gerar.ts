import { db } from "@/lib/db";

/**
 * Gera notificação de nova licitação com score alto.
 */
export async function notificarScoreAlto(
  licitacaoId: string,
  titulo: string,
  score: number,
  classificacao: string
) {
  if (score < 70) return; // Só notifica A+ e A

  await db.notificacao.create({
    data: {
      tipo: "score_alto",
      titulo: `Nova oportunidade ${classificacao} (${score}%)`,
      mensagem: `"${titulo.slice(0, 100)}" recebeu classificação ${classificacao} com score ${score}%. Vale a pena analisar.`,
      licitacaoId,
    },
  });
}

/**
 * Gera notificação de captação concluída.
 */
export async function notificarCaptacaoConcluida(
  fonteNome: string,
  totalCriados: number,
  totalAtualizados: number
) {
  if (totalCriados === 0 && totalAtualizados === 0) return;

  const partes: string[] = [];
  if (totalCriados > 0) partes.push(`${totalCriados} nova(s)`);
  if (totalAtualizados > 0) partes.push(`${totalAtualizados} atualizada(s)`);

  await db.notificacao.create({
    data: {
      tipo: "captacao_concluida",
      titulo: `Captação: ${fonteNome}`,
      mensagem: `Sincronização concluída — ${partes.join(", ")}. Veja no Kanban.`,
    },
  });
}

/**
 * Gera notificações de prazo vencendo (licitações com sessão nos próximos 3 dias).
 */
export async function verificarPrazosVencendo() {
  const agora = new Date();
  const em3dias = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000);

  const licitacoes = await db.licitacao.findMany({
    where: {
      dataSessao: { gte: agora, lte: em3dias },
      card: { isNot: null },
    },
    select: { id: true, titulo: true, dataSessao: true, orgao: true },
  });

  for (const lic of licitacoes) {
    // Não duplicar notificação
    const jaNotificou = await db.notificacao.findFirst({
      where: {
        tipo: "prazo_vencendo",
        licitacaoId: lic.id,
        criadoEm: { gte: new Date(agora.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    if (jaNotificou) continue;

    const dias = Math.ceil(
      (lic.dataSessao!.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)
    );

    await db.notificacao.create({
      data: {
        tipo: "prazo_vencendo",
        titulo: `Sessão em ${dias} dia${dias !== 1 ? "s" : ""}`,
        mensagem: `"${lic.titulo.slice(0, 80)}" ${lic.orgao ? `(${lic.orgao})` : ""} tem sessão marcada para ${lic.dataSessao!.toLocaleDateString("pt-BR")}`,
        licitacaoId: lic.id,
      },
    });
  }
}
