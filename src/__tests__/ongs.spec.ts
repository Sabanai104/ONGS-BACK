import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { Ong } from "../models/Ong";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Ong.init();
});

afterEach(async () => {
  await Ong.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const criarOng = (overrides: Record<string, unknown> = {}) =>
  Ong.create({
    titulo: "Amigos do Bem",
    imagem: "https://cdn.exemplo.com/img.jpg",
    descricao: "Descrição da ONG",
    comoAjudar: "Como ajudar a ONG",
    impactosRealizados: "Impactos já realizados",
    localizacao: { latitude: -23.55052, longitude: -46.633308, nomeEndereco: "Av. Paulista, 1000" },
    categorias: ["educação"],
    ...overrides
  });

describe("GET /ongs", () => {
  it("retorna lista vazia e paginação zerada quando não há ONGs", async () => {
    const response = await request(app).get("/ongs");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it("retorna ONGs em formato resumido, sem campos de detalhe", async () => {
    await criarOng();

    const response = await request(app).get("/ongs");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual({
      id: expect.any(String),
      titulo: "Amigos do Bem",
      imagem: "https://cdn.exemplo.com/img.jpg",
      localizacao: { latitude: -23.55052, longitude: -46.633308 }
    });
  });

  it("pagina os resultados corretamente", async () => {
    await criarOng({ titulo: "ONG 1" });
    await criarOng({ titulo: "ONG 2" });
    await criarOng({ titulo: "ONG 3" });

    const response = await request(app).get("/ongs").query({ page: 2, limit: 2 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it("filtra por categoria (case-insensitive)", async () => {
    await criarOng({ titulo: "Educação ONG", categorias: ["Educação"] });
    await criarOng({ titulo: "Saúde ONG", categorias: ["saúde"] });

    const response = await request(app).get("/ongs").query({ categoria: "SAÚDE" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].titulo).toBe("Saúde ONG");
  });

  it("busca por proximidade geográfica dentro do raio informado", async () => {
    await criarOng({
      titulo: "Perto",
      localizacao: { latitude: -23.55, longitude: -46.63, nomeEndereco: "Perto" }
    });
    await criarOng({
      titulo: "Longe",
      localizacao: { latitude: 40.7128, longitude: -74.006, nomeEndereco: "Longe" }
    });

    const response = await request(app).get("/ongs").query({ lat: -23.55, lng: -46.63, raioKm: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].titulo).toBe("Perto");
  });

  it("retorna 400 quando apenas 'lat' é informado sem 'lng'", async () => {
    const response = await request(app).get("/ongs").query({ lat: -23.55 });
    expect(response.status).toBe(400);
  });

  it("retorna 400 quando 'lat' está fora do intervalo válido", async () => {
    const response = await request(app).get("/ongs").query({ lat: 200, lng: -46.63 });
    expect(response.status).toBe(400);
  });
});

describe("GET /ongs/:id", () => {
  it("retorna 400 para id em formato inválido", async () => {
    const response = await request(app).get("/ongs/id-invalido");
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando a ONG não existe", async () => {
    const idInexistente = new mongoose.Types.ObjectId().toString();
    const response = await request(app).get(`/ongs/${idInexistente}`);
    expect(response.status).toBe(404);
  });

  it("retorna o detalhe completo da ONG, com links ausentes como null", async () => {
    const ong = await criarOng();

    const response = await request(app).get(`/ongs/${ong.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: ong.id,
      titulo: "Amigos do Bem",
      imagem: "https://cdn.exemplo.com/img.jpg",
      descricao: "Descrição da ONG",
      comoAjudar: "Como ajudar a ONG",
      impactosRealizados: "Impactos já realizados",
      localizacao: {
        latitude: -23.55052,
        longitude: -46.633308,
        nomeEndereco: "Av. Paulista, 1000"
      },
      linkSite: null,
      linkInstagram: null,
      categorias: ["educação"],
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it("retorna os links quando cadastrados", async () => {
    const ong = await criarOng({
      linkSite: "https://www.amigosdobem.org",
      linkInstagram: "https://www.instagram.com/amigosdobem"
    });

    const response = await request(app).get(`/ongs/${ong.id}`);

    expect(response.status).toBe(200);
    expect(response.body.linkSite).toBe("https://www.amigosdobem.org");
    expect(response.body.linkInstagram).toBe("https://www.instagram.com/amigosdobem");
  });
});
