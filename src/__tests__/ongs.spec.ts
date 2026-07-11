import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { Ong } from "../models/Ong";
import { Categoria } from "../models/Categoria";

let mongoServer: MongoMemoryServer;
let categoriaEducacao: InstanceType<typeof Categoria>;
let categoriaSaude: InstanceType<typeof Categoria>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Ong.init();
  await Categoria.init();
  [categoriaEducacao, categoriaSaude] = await Categoria.create([
    { nome: "Educação", slug: "educacao" },
    { nome: "Saúde", slug: "saude" }
  ]);
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
    categorias: [categoriaEducacao._id],
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
    await criarOng({ titulo: "Educação ONG", categorias: [categoriaEducacao._id] });
    await criarOng({ titulo: "Saúde ONG", categorias: [categoriaSaude._id] });

    const response = await request(app).get("/ongs").query({ categoria: "SAUDE" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].titulo).toBe("Saúde ONG");
  });

  it("retorna lista vazia quando o slug de categoria não existe", async () => {
    await criarOng();

    const response = await request(app).get("/ongs").query({ categoria: "categoria-inexistente" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it("filtra por categoria combinado com busca por proximidade geográfica", async () => {
    await criarOng({
      titulo: "Perto e da categoria certa",
      categorias: [categoriaSaude._id],
      localizacao: { latitude: -23.55, longitude: -46.63, nomeEndereco: "Perto" }
    });
    await criarOng({
      titulo: "Perto mas de outra categoria",
      categorias: [categoriaEducacao._id],
      localizacao: { latitude: -23.55, longitude: -46.63, nomeEndereco: "Perto" }
    });

    const response = await request(app)
      .get("/ongs")
      .query({ categoria: "saude", lat: -23.55, lng: -46.63, raioKm: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].titulo).toBe("Perto e da categoria certa");
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
      categorias: [
        {
          id: expect.any(String),
          nome: "Educação",
          slug: "educacao",
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ],
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

describe("POST /ongs", () => {
  const payloadOngValida = (overrides: Record<string, unknown> = {}) => ({
    titulo: "Amigos do Bem",
    imagem: "https://cdn.exemplo.com/img.jpg",
    descricao: "Descrição da ONG",
    comoAjudar: "Como ajudar a ONG",
    impactosRealizados: "Impactos já realizados",
    localizacao: { latitude: -23.55052, longitude: -46.633308, nomeEndereco: "Av. Paulista, 1000" },
    categorias: ["educacao"],
    ...overrides
  });

  it("cria uma ONG e retorna 201 com o recurso criado", async () => {
    const response = await request(app).post("/ongs").send(payloadOngValida());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
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
      categorias: [
        {
          id: expect.any(String),
          nome: "Educação",
          slug: "educacao",
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ],
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });

    const salvas = await Ong.countDocuments();
    expect(salvas).toBe(1);
  });

  it("deriva localizacaoGeo a partir de localizacao (verificado via busca por proximidade)", async () => {
    await request(app).post("/ongs").send(payloadOngValida());

    const response = await request(app)
      .get("/ongs")
      .query({ lat: -23.55052, lng: -46.633308, raioKm: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("retorna 400 quando 'titulo' está ausente", async () => {
    const { titulo, ...payload } = payloadOngValida();
    const response = await request(app).post("/ongs").send(payload);

    expect(response.status).toBe(400);
  });

  it("retorna 400 quando 'localizacao' está ausente", async () => {
    const { localizacao, ...payload } = payloadOngValida();
    const response = await request(app).post("/ongs").send(payload);

    expect(response.status).toBe(400);
  });

  it("retorna 400 quando 'localizacao.latitude' é inválida", async () => {
    const response = await request(app)
      .post("/ongs")
      .send(payloadOngValida({ localizacao: { latitude: "não-numero", longitude: -46.633308, nomeEndereco: "X" } }));

    expect(response.status).toBe(400);
  });

  it("retorna 400 quando uma categoria informada não existe", async () => {
    const response = await request(app)
      .post("/ongs")
      .send(payloadOngValida({ categorias: ["categoria-inexistente"] }));

    expect(response.status).toBe(400);
  });
});

describe("PUT /ongs/:id", () => {
  it("atualiza parcialmente uma ONG, mantendo os campos não enviados", async () => {
    const ong = await criarOng();

    const response = await request(app).put(`/ongs/${ong.id}`).send({ titulo: "Novo Nome" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: ong.id,
      titulo: "Novo Nome",
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
      categorias: [
        {
          id: expect.any(String),
          nome: "Educação",
          slug: "educacao",
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ],
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it("atualiza localizacao e re-deriva localizacaoGeo (verificado via busca por proximidade)", async () => {
    const ong = await criarOng();
    const novoPonto = { latitude: 40.7128, longitude: -74.006, nomeEndereco: "Nova York" };

    const response = await request(app).put(`/ongs/${ong.id}`).send({ localizacao: novoPonto });
    expect(response.status).toBe(200);

    const buscaPontoAntigo = await request(app)
      .get("/ongs")
      .query({ lat: -23.55052, lng: -46.633308, raioKm: 1 });
    expect(buscaPontoAntigo.body.data).toHaveLength(0);

    const buscaPontoNovo = await request(app)
      .get("/ongs")
      .query({ lat: novoPonto.latitude, lng: novoPonto.longitude, raioKm: 1 });
    expect(buscaPontoNovo.body.data).toHaveLength(1);
  });

  it("retorna 400 para id em formato inválido", async () => {
    const response = await request(app).put("/ongs/id-invalido").send({ titulo: "Novo Nome" });
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando a ONG não existe", async () => {
    const idInexistente = new mongoose.Types.ObjectId().toString();
    const response = await request(app).put(`/ongs/${idInexistente}`).send({ titulo: "Novo Nome" });
    expect(response.status).toBe(404);
  });

  it("retorna 400 quando 'localizacao.latitude' é inválida", async () => {
    const ong = await criarOng();

    const response = await request(app)
      .put(`/ongs/${ong.id}`)
      .send({ localizacao: { latitude: "não-numero", longitude: -46.633308, nomeEndereco: "X" } });

    expect(response.status).toBe(400);
  });

  it("retorna 400 quando uma categoria informada não existe", async () => {
    const ong = await criarOng();

    const response = await request(app).put(`/ongs/${ong.id}`).send({ categorias: ["categoria-inexistente"] });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /ongs/:id", () => {
  it("deleta uma ONG existente e retorna 204", async () => {
    const ong = await criarOng();

    const response = await request(app).delete(`/ongs/${ong.id}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const salvas = await Ong.countDocuments();
    expect(salvas).toBe(0);
  });

  it("retorna 400 para id em formato inválido", async () => {
    const response = await request(app).delete("/ongs/id-invalido");
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando a ONG não existe", async () => {
    const idInexistente = new mongoose.Types.ObjectId().toString();
    const response = await request(app).delete(`/ongs/${idInexistente}`);
    expect(response.status).toBe(404);
  });
});
