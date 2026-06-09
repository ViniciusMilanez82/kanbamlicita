import { BOLETIM_COLUNAS, type BoletimRow } from "./types";

/**
 * Lê um texto separado por delimitador (CSV) respeitando aspas.
 *
 * Suporta:
 * - campos entre aspas com o delimitador dentro (`"a;b"`);
 * - aspas escapadas dobradas dentro do campo (`""`);
 * - quebras de linha dentro de um campo entre aspas;
 * - finais de linha `\n` e `\r\n`;
 * - BOM no início do arquivo.
 *
 * Puro: roda tanto no navegador quanto no servidor.
 */
export function parseDelimitado(texto: string, delimitador = ";"): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  let i = 0;
  if (texto.charCodeAt(0) === 0xfeff) i = 1; // remove BOM

  for (; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === delimitador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c === "\r") {
      // ignora; o \n seguinte (se houver) encerra a linha
    } else {
      campo += c;
    }
  }

  // último campo/linha pendente
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

/**
 * Converte o texto de um boletim ConLicitação em linhas estruturadas.
 *
 * O mapeamento é feito pelo cabeçalho (primeira linha), então a ordem das
 * colunas no arquivo não precisa ser exatamente a esperada. Colunas
 * desconhecidas são ignoradas; colunas ausentes ficam como string vazia.
 */
export function parseBoletimCsv(texto: string): BoletimRow[] {
  const matriz = parseDelimitado(texto, ";");
  if (matriz.length === 0) return [];

  const cabecalho = matriz[0].map((h) => h.trim().toLowerCase());
  const colunasConhecidas = new Set<string>(BOLETIM_COLUNAS);

  const linhas: BoletimRow[] = [];
  for (let r = 1; r < matriz.length; r++) {
    const celulas = matriz[r];
    // pula linhas totalmente vazias
    if (celulas.every((c) => c.trim() === "")) continue;

    const obj = {} as BoletimRow;
    for (const col of BOLETIM_COLUNAS) obj[col] = "";

    cabecalho.forEach((h, idx) => {
      if (colunasConhecidas.has(h)) {
        (obj as Record<string, string>)[h] = (celulas[idx] ?? "").trim();
      }
    });

    linhas.push(obj);
  }

  return linhas;
}
