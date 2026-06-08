import { parseBoletimCsv, parseDelimitado } from "@/lib/conlicitacao/parser";
import {
  parseCidadeUf,
  parseValorBR,
  parseDataDMY,
  parseDataPublicacao,
  modalidadeDoEdital,
  primeiroSiteValido,
  dedupIdBoletim,
  montarLicitacaoBoletim,
} from "@/lib/conlicitacao/normalize";
import { classificarStatus, type BoletimRow } from "@/lib/conlicitacao/types";

const CABECALHO =
  "status;motivo;cidade;edital;conlicitacao;processo;datas;data_publicacao;valor_estimado;objeto;sintese;edital_online;unidade;endereco;cep;telefones;fax;email;site1;site2;observacao";

describe("parseDelimitado", () => {
  it("respeita aspas com ponto e vírgula e quebras de linha internas", () => {
    const texto = 'a;b;c\n1;"tem ; dentro";"linha1\nlinha2"';
    const m = parseDelimitado(texto, ";");
    expect(m[1]).toEqual(["1", "tem ; dentro", "linha1\nlinha2"]);
  });

  it("trata aspas escapadas dobradas", () => {
    const m = parseDelimitado('x\n"diz ""oi"""', ";");
    expect(m[1]).toEqual(['diz "oi"']);
  });
});

describe("parseBoletimCsv", () => {
  it("mapeia colunas pelo cabeçalho e ignora linhas vazias", () => {
    const texto = `${CABECALHO}\nESCOPO;motivo x;Campo Mourão - PR;PE/63/2026;18991760;234/2026;Prazo: 19/06/2026, 13:59;;R$ 532.600,00;LOCAÇÃO DE CONTAINERS;;Disponível;Prefeitura de Campo Mourão;Rua Brasil;87301-140;;;;;;obs\n\n`;
    const rows = parseBoletimCsv(texto);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ESCOPO");
    expect(rows[0].cidade).toBe("Campo Mourão - PR");
    expect(rows[0].conlicitacao).toBe("18991760");
    expect(rows[0].valor_estimado).toBe("R$ 532.600,00");
  });
});

describe("normalizadores", () => {
  it("separa cidade e UF", () => {
    expect(parseCidadeUf("Campo Mourão - PR")).toEqual({
      municipio: "Campo Mourão",
      uf: "PR",
    });
    expect(parseCidadeUf("Sem UF")).toEqual({ municipio: "Sem UF", uf: null });
  });

  it("converte valor em reais", () => {
    expect(parseValorBR("R$ 532.600,00")).toBe(532600);
    expect(parseValorBR("R$ 76.624,11")).toBeCloseTo(76624.11);
    expect(parseValorBR("")).toBeNull();
  });

  it("extrai data e hora do campo datas", () => {
    const d = parseDataDMY("Prazo: 19/06/2026, 13:59");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5); // junho
    expect(d?.getDate()).toBe(19);
    expect(parseDataDMY("")).toBeNull();
  });

  it("tenta interpretar data_publicacao em texto livre", () => {
    const d = parseDataPublicacao("02 de Junho Rio Grande do Sul", 2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(2);
  });

  it("deduz a modalidade pelo prefixo do edital", () => {
    expect(modalidadeDoEdital("PE/63/2026")).toBe("Pregão Eletrônico");
    expect(modalidadeDoEdital("CR/11/2025")).toBe("Concorrência");
    expect(modalidadeDoEdital("DL/10/2026")).toBe("Dispensa de Licitação");
    expect(modalidadeDoEdital("ZZ/1/2026")).toBeNull();
  });

  it("normaliza site sem protocolo", () => {
    expect(primeiroSiteValido("", "www.licitacoes-e.com.br")).toBe(
      "https://www.licitacoes-e.com.br"
    );
    expect(primeiroSiteValido("https://pncp.gov.br")).toBe("https://pncp.gov.br");
    expect(primeiroSiteValido("", "")).toBeNull();
  });

  it("usa o número ConLicitação como id de deduplicação", () => {
    const row = { conlicitacao: "18991760", edital: "PE/63/2026", cidade: "X - PR" } as BoletimRow;
    expect(dedupIdBoletim(row)).toBe("conlicitacao:18991760");
  });
});

describe("classificarStatus", () => {
  it("reconhece os status da triagem", () => {
    expect(classificarStatus("ESCOPO")).toBe("ESCOPO");
    expect(classificarStatus("conferir")).toBe("CONFERIR");
    expect(classificarStatus("RUIDO")).toBe("RUIDO");
    expect(classificarStatus("qualquer")).toBe("OUTRO");
  });
});

describe("montarLicitacaoBoletim", () => {
  it("monta os campos da licitação a partir de uma linha completa", () => {
    const texto = `${CABECALHO}\nESCOPO;container/modulo + uso de escopo;Campo Mourão - PR;PE/63/2026;18991760;234/2026;Prazo: 19/06/2026, 13:59;;R$ 532.600,00;LOCAÇÃO DE CONTAINERS MODULAR;;Disponível;Prefeitura Municipal de Campo Mourão;Rua Brasil, 1407;87301-140;;;;;;Pregão Eletrônico`;
    const row = parseBoletimCsv(texto)[0];
    const lic = montarLicitacaoBoletim(row);

    expect(lic.dedupId).toBe("conlicitacao:18991760");
    expect(lic.titulo).toBe("LOCAÇÃO DE CONTAINERS MODULAR");
    expect(lic.orgao).toBe("Prefeitura Municipal de Campo Mourão");
    expect(lic.modalidade).toBe("Pregão Eletrônico");
    expect(lic.uf).toBe("PR");
    expect(lic.municipio).toBe("Campo Mourão");
    expect(lic.valorEstimado).toBe(532600);
    expect(lic.numeroCompra).toBe("PE/63/2026");
    expect(lic.processo).toBe("234/2026");
    expect(lic.dataSessao?.getDate()).toBe(19);
    expect(lic.observacoes).toContain("ConLicitação");
  });
});
