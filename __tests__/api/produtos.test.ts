import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: "u1", role: "user" } })),
}));

jest.unstable_mockModule("@/lib/db", () => ({
  db: {
    produto: {
      findMany: jest.fn(() => Promise.resolve([{ id: "p1", nome: "Container", descricao: null, categoria: null, palavrasChave: [], ativo: true }])),
      create: jest.fn((args: any) => Promise.resolve({ id: "p2", ...args.data, ativo: true })),
      delete: jest.fn(() => Promise.resolve({ id: "p1" })),
    },
  },
}));

const { GET, POST } = await import("@/app/api/produtos/route");

describe("GET /api/produtos", () => {
  it("returns products list", async () => {
    const res = await GET();
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].nome).toBe("Container");
  });
});

describe("POST /api/produtos", () => {
  it("creates a product", async () => {
    const req = new Request("http://localhost/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Modulo", descricao: "desc", categoria: "cat" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("rejects without nome", async () => {
    const req = new Request("http://localhost/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: "desc" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
