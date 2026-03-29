import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: "u1", role: "admin" } })),
}));

jest.unstable_mockModule("@/lib/db", () => ({
  db: {
    empresa: {
      findUnique: jest.fn(() => Promise.resolve({ id: "default", nome: "Test", descricao: null, segmento: null })),
      upsert: jest.fn((args: any) => Promise.resolve({ id: "default", ...args.update })),
    },
  },
}));

const { GET, PUT } = await import("@/app/api/empresa/route");

describe("GET /api/empresa", () => {
  it("returns the empresa", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.nome).toBe("Test");
  });
});

describe("PUT /api/empresa", () => {
  it("updates the empresa", async () => {
    const req = new Request("http://localhost/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Nova", descricao: "Desc", segmento: "TI" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});
