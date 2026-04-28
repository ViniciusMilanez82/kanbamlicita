import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const TIPOS_VALIDOS = ["edital", "tr", "proposta", "ata", "contrato", "outro"];

// GET — listar documentos da licitação
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  const documentos = await db.documento.findMany({
    where: { licitacaoId: id },
    orderBy: { criadoEm: "desc" },
    include: { enviadoPor: { select: { name: true } } },
  });

  return NextResponse.json(documentos);
}

// POST — upload de documento
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { id } = await params;

  // Verificar se a licitação existe
  const licitacao = await db.licitacao.findUnique({ where: { id } });
  if (!licitacao) {
    return NextResponse.json({ error: "Licitação não encontrada" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "outro";

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 20MB)" }, { status: 400 });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  // Criar diretório de uploads se não existir
  const licitacaoDir = path.join(UPLOAD_DIR, id);
  await mkdir(licitacaoDir, { recursive: true });

  // Nome único para evitar colisão
  const ext = path.extname(file.name) || "";
  const nomeUnico = `${randomUUID()}${ext}`;
  const caminho = path.join(licitacaoDir, nomeUnico);

  // Escrever arquivo no disco
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(caminho, buffer);

  // Salvar registro no banco
  const documento = await db.documento.create({
    data: {
      licitacaoId: id,
      nome: nomeUnico,
      nomeOriginal: file.name,
      tipo,
      tamanho: file.size,
      mimeType: file.type || "application/octet-stream",
      caminho: `uploads/${id}/${nomeUnico}`,
      enviadoPorId: auth.userId,
    },
    include: { enviadoPor: { select: { name: true } } },
  });

  return NextResponse.json(documento, { status: 201 });
}

// DELETE — excluir documento
export async function DELETE(
  req: Request,
  _ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "docId obrigatório" }, { status: 400 });
  }

  const doc = await db.documento.findUnique({ where: { id: docId } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // Remover arquivo do disco (melhor esforço)
  try {
    await unlink(path.join(process.cwd(), doc.caminho));
  } catch {
    // Arquivo pode já ter sido removido
  }

  await db.documento.delete({ where: { id: docId } });

  return NextResponse.json({ ok: true });
}
