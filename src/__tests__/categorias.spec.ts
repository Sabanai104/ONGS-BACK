import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { Categoria } from "../models/Categoria";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Categoria.init();
});

afterEach(async () => {
  await Categoria.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const criarCategoria = (overrides: Record<string, unknown> = {}) =>
  Categoria.create({ nome: "Educação", slug: "educacao", ...overrides });

describe("GET /categorias", () => {
  it("retorna lista vazia quando não há categorias", async () => {
    const response = await request(app).get("/categorias");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("retorna categorias ordenadas por nome", async () => {
    await criarCategoria({ nome: "Saúde", slug: "saude" });
    await criarCategoria({ nome: "Educação", slug: "educacao" });
    await criarCategoria({ nome: "Assistência social", slug: "assistencia-social" });

    const response = await request(app).get("/categorias");

    expect(response.status).toBe(200);
    expect(response.body.map((categoria: { nome: string }) => categoria.nome)).toEqual([
      "Assistência social",
      "Educação",
      "Saúde"
    ]);
  });

  it("retorna o shape completo da categoria", async () => {
    await criarCategoria();

    const response = await request(app).get("/categorias");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: expect.any(String),
        nome: "Educação",
        slug: "educacao",
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    ]);
  });
});
