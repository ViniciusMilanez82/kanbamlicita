import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { temPermissaoEscrita } from "@/lib/documentos-empresa/permissoes";
import { registrarAuditoriaDoc } from "@/lib/documentos-empresa/auditoria";
import {
  calcularNivelAlerta,
  statusPorAlerta,
} from "@/lib/documentos-empresa/alertas";
import type { CategoriaHabilitacao } from "@/lib/generated/prisma/client";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "empresa");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (PRD)

const CATEGORIAS_VALIDAS: CategoriaHabilitacao[] = [
  "juridica",
  "fiscal",
  "trabalhista",
  "tecnica",
  "economica",
  "complementar",
];

// GET — listar documentos da empresa com filtros
export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const cnpj = searchParams.get("cnpj");
  const categoria = searchParams.get("categoria") as CategoriaHabilitacao | null;
  const status = searchParams.get("status");
  const tipoDocumento = searchParams.get("tipoDocumento");
  const busca = searchParams.get("busca");

  const where: Record<string, unknown> = {};
  if (cnpj) where.cnpj = cnpj;
  if (categoria && CATEGORIAS_VALIDAS.includes(categoria))
    where.categoria = categoria;
  if (status) where.status = status;
  if (tipoDocumento) where.tipoDocumento = { contains: tipoDocumento, mode: "insensitive" };
  if (busca) {
    where.OR = [
      { tipoDocumento: { contains: busca, mode: "insensitive" } },
      { nomeOriginal: { contains: busca, mode: "insensitive" } },
      { orgaoEmissor: { contains: busca, mode: "insensitive" } },
    ];
  }

  const documentos = await db.documentoEmpresa.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { tipoDocumento: "asc" }, { versao: "desc" }],
    include: { enviadoPor: { select: { name: true } } },
  });

  return NextResponse.json(documentos);
}

// POST — upload de novo documento da empresa
export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoEscrita(auth.role)) {
    return NextResponse.json(
      { error: "Sem permissão para upload" },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const cnpj = formData.get("cnpj") as string;
  const categoria = formData.get("categoria") as CategoriaHabilitacao;
  const tipoDocumento = formData.get("tipoDocumento") as string;
  const dataEmissao = formData.get("dataEmissao") as string | null;
  const dataValidade = formData.get("dataValidade") as string | null;
  const orgaoEmissor = formData.get("orgaoEmissor") as string | null;
  const observacoes = formData.get("observacoes") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }
  if (!cnpj || !categoria || !tipoDocumento) {
    return NextResponse.json(
      { error: "CNPJ, categoria e tipo de documento são obrigatórios" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 10MB)" },
      { status: 400 }
    );
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return NextResponse.json(
      { error: "Categoria inválida" },
      { status: 400 }
    );
  }

  // Salvar arquivo no disco
  const cnpjDir = path.join(UPLOAD_DIR, cnpj.replace(/\D/g, ""));
  await mkdir(cnpjDir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const nomeUnico = `${randomUUID()}${ext}`;
  const caminho = path.join(cnpjDir, nomeUnico);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(caminho, buffer);

  const caminhoRelativo = `uploads/empresa/${cnpj.replace(/\D/g, "")}/${nomeUnico}`;

  // Calcular nível de alerta
  const dataValidadeDate = dataValidade ? new Date(dataValidade) : null;
  const config = await db.configuracaoAlertaDoc.findUnique({
    where: { tipoDocumento },
  });
  const nivelAlerta = calcularNivelAlerta(dataValidadeDate, config);
  const statusDoc = statusPorAlerta(nivelAlerta);

  const documento = await db.documentoEmpresa.create({
    data: {
      cnpj,
      categoria,
      tipoDocumento,
      nome: nomeUnico,
      nomeOriginal: file.name,
      tamanho: file.size,
      mimeType: file.type || "application/octet-stream",
      caminho: caminhoRelativo,
      dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
      dataValidade: dataValidadeDate,
      orgaoEmissor: orgaoEmissor || null,
      observacoes: observacoes || null,
      status: statusDoc,
      nivelAlerta,
      enviadoPorId: auth.userId,
    },
    include: { enviadoPor: { select: { name: true } } },
  });

  // Registrar auditoria
  await registrarAuditoriaDoc({
    documentoId: documento.id,
    acao: "upload",
    detalhes: `Upload: ${file.name} (${tipoDocumento})`,
    realizadoPorId: auth.userId,
  });

  return NextResponse.json(documento, { status: 201 });
}
