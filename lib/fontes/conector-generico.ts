import { createHash } from "crypto";
import type { Conector, FonteConfig, ResultadoConector } from "./types";

function hashId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function extrairTexto(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function parsearRss(xml: string): ResultadoConector[] {
  const resultados: ResultadoConector[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1] ?? match[2] ?? "";

    const titulo = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() ?? "";
    const link = content.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1]
      ?? content.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      ?? "";
    const descricao = content.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()
      ?? content.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()
      ?? "";
    const data = content.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      ?? content.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      ?? content.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim()
      ?? "";

    const id = link || titulo;
    if (!id) continue;

    resultados.push({
      identificadorExterno: `ext:${hashId(id)}`,
      dados: {
        titulo: extrairTexto(titulo),
        objeto: extrairTexto(descricao),
        linkOrigem: link || undefined,
        dataPublicacao: data || undefined,
      },
      dadosBrutos: { titulo, link, descricao, data },
    });
  }

  return resultados;
}

export class ConectorGenerico implements Conector {
  async *buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]> {
    const url = fonte.parametros.url;
    if (!url) {
      throw new Error("URL não configurada para a fonte genérica");
    }

    const res = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Erro ao acessar a fonte (${res.status}): ${url}`);
    }

    const text = await res.text();

    // Detect RSS/Atom
    if (text.includes("<rss") || text.includes("<feed") || text.includes("<channel")) {
      const resultados = parsearRss(text);
      if (resultados.length > 0) {
        yield resultados;
      }
      return;
    }

    // Fallback: scraping — extract links
    const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const resultados: ResultadoConector[] = [];
    let linkMatch;

    while ((linkMatch = linkRegex.exec(text)) !== null) {
      const href = linkMatch[1] ?? "";
      const tituloRaw = linkMatch[2] ?? "";
      const titulo = extrairTexto(tituloRaw);

      if (!titulo || titulo.length < 10) continue;

      resultados.push({
        identificadorExterno: `ext:${hashId(href || titulo)}`,
        dados: {
          titulo,
          linkOrigem: href.startsWith("http") ? href : undefined,
        },
        dadosBrutos: { href, titulo: tituloRaw },
      });
    }

    if (resultados.length > 0) {
      yield resultados;
    }
  }
}
