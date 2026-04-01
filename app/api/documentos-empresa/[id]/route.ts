import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { readFile } from "fs/promises";
import path from "path";
import { temPermissaoEscrita, temPermissaoAdmin } from "@/lib/documentos-empresa/permissoes";
import { registrarAuditoriaDoc } from "@/lib/documentos-empresa/auditoria";
import { calcularNivelAlerta, statusPorAlerta } from "@/lib/documentos-empresa/alertas";

// GET — download do arquivo
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const doc = await db.documentoEmpresa.findUnique({ where: { id } });
  if (!doc) {
    return new Response("Documento não encontrado", { status: 404 });
  }

  // Registrar download na auditoria
  registrarAuditoriaDoc({
    documentoId: doc.id,
    acao: "download",
    detalhes: `Download: ${doc.nomeOriginal}`,
    realizadoPorId: auth.userId,
  }).catch(() => {});

  try {
    const filePath = path.join(process.cwd(), doc.caminho);
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.nomeOriginal)}"`,
        "Content-Length": String(doc.tamanho),
      },
    });
  } catch {
    return new Response("Arquivo não encontrado no servidor", { status: 404 });
  }
}

// PATCH — editar metadados
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoEscrita(auth.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { dataEmissao, dataValidade, orgaoEmissor, observacoes } = body;

  const doc = await db.documentoEmpresa.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  // Recalcular alerta se validade mudou
  const novaValidade = dataValidade !== undefined
    ? (dataValidade ? new Date(dataValidade) : null)
    : doc.dataValidade;

  const config = await db.configuracaoAlertaDoc.findUnique({
    where: { tipoDocumento: doc.tipoDocumento },
  });
  const nivelAlerta = calcularNivelAlerta(novaValidade, config);
  const status = statusPorAlerta(nivelAlerta);

  const atualizado = await db.documentoEmpresa.update({
    where: { id },
    data: {
      ...(dataEmissao !== undefined && {
        dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
      }),
      ...(dataValidade !== undefined && { dataValidade: novaValidade }),
      ...(orgaoEmissor !== undefined && { orgaoEmissor }),
      ...(observacoes !== undefined && { observacoes }),
      nivelAlerta,
      status,
    },
    include: { enviadoPor: { select: { name: true } } },
  });

  await registrarAuditoriaDoc({
    documentoId: id,
    acao: "alteracao_metadata",
    detalhes: `Campos alterados: ${Object.keys(body).join(", ")}`,
    realizadoPorId: auth.userId,
  });

  return NextResponse.json(atualizado);
}

// DELETE — soft-delete (marca como substituído)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoAdmin(auth.role)) {
    return NextResponse.json(
      { error: "Apenas administradores podem excluir" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const doc = await db.documentoEmpresa.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await db.documentoEmpresa.update({
    where: { id },
    data: { status: "substituido" },
  });

  await registrarAuditoriaDoc({
    documentoId: id,
    acao: "exclusao",
    detalhes: `Documento marcado como substituído: ${doc.nomeOriginal}`,
    realizadoPorId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
