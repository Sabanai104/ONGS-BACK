# Documento de Requisitos — API de ONGs

## 1. Objetivo

Definir os requisitos para implementação de dois endpoints no backend (MyOngsBack) responsáveis por:

1. Listar ONGs de forma resumida (para uso em telas de listagem/mapa).
2. Retornar os detalhes completos de uma ONG específica (para uso em tela de detalhe).

## 2. Escopo

Está dentro do escopo:
- Modelo de dados `ONG` (schema Mongoose) contemplando os campos usados na listagem e no detalhe.
- Endpoint `GET /ongs` (listagem resumida).
- Endpoint `GET /ongs/:id` (detalhe completo).
- Endpoint `POST /ongs` (criação).
- Endpoint `PUT /ongs/:id` (edição).
- Validações e tratamento de erros dos endpoints.

Fora do escopo deste documento:
- Remoção de ONGs (`DELETE`).
- Autenticação/autorização.
- Upload de imagens (o campo de imagem assume que já existe uma URL disponível).

## 3. Modelo de dados — Entidade `ONG`

| Campo | Tipo | Obrigatório | Usado na listagem | Usado no detalhe | Observações |
|---|---|---|---|---|---|
| `id` | string (ObjectId) | sim | sim | sim | Gerado pelo MongoDB (`_id`) |
| `titulo` | string | sim | sim | sim | Nome da ONG |
| `imagem` | string (URL) | sim | sim | sim | URL da imagem/capa |
| `localizacao.latitude` | number | sim | sim | sim | |
| `localizacao.longitude` | number | sim | sim | sim | |
| `localizacao.nomeEndereco` | string | sim | não | sim | Endereço legível (ex.: "Rua X, 123 — Bairro, Cidade") |
| `descricao` | string | sim | não | sim | Texto livre descrevendo a ONG |
| `comoAjudar` | string | sim | não | sim | Texto livre — formas de contribuir |
| `impactosRealizados` | string | sim | não | sim | Texto livre — resultados/impactos já alcançados |
| `linkSite` | string (URL) | não | não | sim | Pode ser vazio/nulo se a ONG não tiver site |
| `linkInstagram` | string (URL) | não | não | sim | Pode ser vazio/nulo se a ONG não tiver Instagram |
| `categorias` | string[] | sim | não | sim | Ex.: `["educação", "meio ambiente"]` |
| `createdAt` / `updatedAt` | Date | sim | não | não | Timestamps automáticos do Mongoose |

### Rascunho do Schema (Mongoose)

```ts
const LocalizacaoSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    nomeEndereco: { type: String, required: true }
  },
  { _id: false }
);

const OngSchema = new Schema(
  {
    titulo: { type: String, required: true },
    imagem: { type: String, required: true },
    descricao: { type: String, required: true },
    comoAjudar: { type: String, required: true },
    impactosRealizados: { type: String, required: true },
    localizacao: { type: LocalizacaoSchema, required: true },
    linkSite: { type: String },
    linkInstagram: { type: String },
    categorias: { type: [String], required: true, default: [] }
  },
  { timestamps: true }
);
```

> Nota: `localizacao` na listagem usa apenas `latitude`/`longitude`; `nomeEndereco` fica oculto na resposta resumida mesmo existindo no schema (ver seção 4.1).

## 4. Endpoints

### 4.1 `GET /ongs` — Listar ONGs (resumido)

**Descrição:** retorna todas as ONGs em formato resumido, para exibição em lista/mapa.

**Request**
- Método: `GET`
- Path: `/ongs`
- Query params (opcional, sugerido para o futuro, não obrigatório na primeira versão):
  - `categoria` — filtra por categoria
  - `page`, `limit` — paginação

**Response — 200 OK**
```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "titulo": "Amigos do Bem",
    "imagem": "https://cdn.exemplo.com/ongs/amigos-do-bem.jpg",
    "localizacao": {
      "latitude": -23.55052,
      "longitude": -46.633308
    }
  }
]
```

**Regras de negócio**
- Retorna array vazio `[]` (não erro) quando não há ONGs cadastradas.
- Campos de detalhe (`descricao`, `comoAjudar`, `impactosRealizados`, `linkSite`, `linkInstagram`, `categorias`, `localizacao.nomeEndereco`) **não** devem ser incluídos na resposta, para manter o payload leve.

**Erros**
| Status | Cenário |
|---|---|
| 500 | Erro inesperado (ex.: falha de conexão com o banco) |

---

### 4.2 `GET /ongs/:id` — Detalhe de uma ONG

**Descrição:** retorna todos os dados de uma ONG específica.

**Request**
- Método: `GET`
- Path: `/ongs/:id`
- Path param: `id` — ObjectId da ONG

**Response — 200 OK**
```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "titulo": "Amigos do Bem",
  "imagem": "https://cdn.exemplo.com/ongs/amigos-do-bem.jpg",
  "descricao": "ONG dedicada a combater a fome e a pobreza extrema no semiárido brasileiro.",
  "comoAjudar": "Você pode doar mensalmente, se voluntariar ou doar itens.",
  "impactosRealizados": "Mais de 1 milhão de pessoas atendidas desde a fundação.",
  "localizacao": {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "nomeEndereco": "Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
  },
  "linkSite": "https://www.amigosdobem.org",
  "linkInstagram": "https://www.instagram.com/amigosdobem",
  "categorias": ["combate à fome", "assistência social"]
}
```

**Regras de negócio**
- Se `id` não for um ObjectId válido, retornar `400 Bad Request`.
- Se nenhuma ONG for encontrada com o `id` informado, retornar `404 Not Found`.
- `linkSite` e `linkInstagram` devem ser omitidos ou retornados como `null` quando não cadastrados (definir um dos dois comportamentos e manter consistência).

**Erros**
| Status | Cenário |
|---|---|
| 400 | `id` com formato inválido |
| 404 | ONG não encontrada |
| 500 | Erro inesperado |

---

### 4.3 `POST /ongs` — Criar ONG

**Descrição:** cria uma nova ONG a partir dos dados enviados no corpo da requisição.

**Request**
- Método: `POST`
- Path: `/ongs`
- Body (`application/json`):

```json
{
  "titulo": "Amigos do Bem",
  "imagem": "https://cdn.exemplo.com/ongs/amigos-do-bem.jpg",
  "descricao": "ONG dedicada a combater a fome e a pobreza extrema no semiárido brasileiro.",
  "comoAjudar": "Você pode doar mensalmente, se voluntariar ou doar itens.",
  "impactosRealizados": "Mais de 1 milhão de pessoas atendidas desde a fundação.",
  "localizacao": {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "nomeEndereco": "Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
  },
  "linkSite": "https://www.amigosdobem.org",
  "linkInstagram": "https://www.instagram.com/amigosdobem",
  "categorias": ["combate à fome", "assistência social"]
}
```

| Campo | Obrigatório | Observações |
|---|---|---|
| `titulo` | sim | |
| `imagem` | sim | URL |
| `descricao` | sim | |
| `comoAjudar` | sim | |
| `impactosRealizados` | sim | |
| `localizacao.latitude` | sim | |
| `localizacao.longitude` | sim | |
| `localizacao.nomeEndereco` | sim | |
| `linkSite` | não | default `null` se omitido |
| `linkInstagram` | não | default `null` se omitido |
| `categorias` | não | default `[]` se omitido |

**Response — 201 Created**

Retorna o recurso criado, no mesmo formato de `GET /ongs/:id` (ver 4.2), incluindo `id`, `createdAt` e `updatedAt` gerados pelo MongoDB/Mongoose.

**Regras de negócio**
- Apenas os campos listados na tabela acima são aceitos do corpo da requisição; qualquer outro campo enviado (ex.: `localizacaoGeo`, `id`) é ignorado.
- `localizacaoGeo` (GeoJSON usado na busca por proximidade, ver seção 8) nunca é aceito do cliente — é sempre derivado no servidor a partir de `localizacao.latitude`/`longitude`.
- A validação de obrigatoriedade e tipos é feita pelo schema Mongoose (`Ong.create(...)`); qualquer violação retorna `400`.

**Erros**
| Status | Cenário |
|---|---|
| 400 | Campo obrigatório ausente (ex.: `titulo`, `localizacao`) |
| 400 | Campo com tipo inválido (ex.: `localizacao.latitude` não numérico) |
| 500 | Erro inesperado (ex.: falha de conexão com o banco) |

A mensagem de erro em `400` lista os campos inválidos, ex.: `{ "message": "Campos inválidos: titulo, localizacao.latitude." }`.

---

### 4.4 `PUT /ongs/:id` — Editar ONG

**Descrição:** atualiza parcialmente os dados de uma ONG existente. Apenas os campos enviados no body são alterados; campos omitidos mantêm o valor atual.

**Request**
- Método: `PUT`
- Path: `/ongs/:id`
- Path param: `id` — ObjectId da ONG
- Body (`application/json`) — qualquer subconjunto dos campos abaixo:

```json
{
  "titulo": "Novo Nome",
  "linkInstagram": "https://www.instagram.com/novoperfil"
}
```

| Campo | Observações |
|---|---|
| `titulo` | |
| `imagem` | URL |
| `descricao` | |
| `comoAjudar` | |
| `impactosRealizados` | |
| `localizacao` | Se enviado, substitui o subdocumento inteiro (`latitude`, `longitude` e `nomeEndereco` juntos — não há merge campo a campo dentro de `localizacao`) |
| `linkSite` | |
| `linkInstagram` | |
| `categorias` | |

**Response — 200 OK**

Retorna o recurso atualizado, no mesmo formato de `GET /ongs/:id` (ver 4.2).

**Regras de negócio**
- Apenas os mesmos campos aceitos por `POST /ongs` são lidos do body (whitelist); qualquer outro campo enviado (ex.: `localizacaoGeo`, `id`) é ignorado.
- Campos omitidos no body preservam o valor atual da ONG (atualização parcial, não substituição completa).
- Se `localizacao` for enviada, `localizacaoGeo` é automaticamente recalculado no servidor a partir do novo `latitude`/`longitude` (ver seção 8).
- A validação de tipos é feita pelo schema Mongoose; qualquer violação retorna `400`.

**Erros**
| Status | Cenário |
|---|---|
| 400 | `id` com formato inválido |
| 400 | Campo com tipo inválido (ex.: `localizacao.latitude` não numérico) |
| 404 | ONG não encontrada |
| 500 | Erro inesperado |

A mensagem de erro em `400` de validação lista os campos inválidos, no mesmo formato de `POST /ongs`.

## 5. Requisitos não funcionais

- Endpoints devem responder com `Content-Type: application/json`.
- Estrutura de rotas deve seguir o padrão já existente em `src/routes/index.ts` (Express Router).
- Modelo deve seguir o padrão já existente em `src/models/User.ts` (Mongoose Schema + `model()`).
- Cobertura de testes (Jest + Supertest) para os quatro endpoints, incluindo os casos de erro (400/404) e o caso de lista vazia.

## 6. Perguntas em aberto (respondidas)

- **Paginação:** implementada já na primeira versão. `GET /ongs` aceita `page` (default `1`) e `limit` (default `10`, máximo `50`) e retorna metadados de paginação (`total`, `totalPages`) junto aos dados — ver seção 4.1 atualizada.
- **`linkSite`/`linkInstagram` ausentes:** retornam `null` (nunca omitidos, nunca string vazia).
- **Busca/filtro:** implementados na primeira versão, ambos como query params de `GET /ongs` (sem necessidade de rota separada):
  - `categoria` — filtra ONGs cuja lista de `categorias` contenha o valor informado (comparação case-insensitive).
  - `lat` + `lng` + `raioKm` (opcional, default `10`) — busca por proximidade geográfica, retornando apenas ONGs dentro do raio informado a partir do ponto informado. `lat` e `lng` devem ser informados juntos (400 se apenas um for enviado). A ordenação, quando essa busca é usada, é por distância crescente até o ponto de referência.

## 7. Atualização da seção 4.1 — `GET /ongs` (com paginação e busca)

**Query params**

| Param | Obrigatório | Default | Descrição |
|---|---|---|---|
| `page` | não | `1` | Página atual (mínimo 1) |
| `limit` | não | `10` | Itens por página (máximo 50) |
| `categoria` | não | — | Filtra ONGs que possuam essa categoria (case-insensitive) |
| `lat` | não* | — | Latitude do ponto de referência para busca por proximidade |
| `lng` | não* | — | Longitude do ponto de referência para busca por proximidade |
| `raioKm` | não | `10` | Raio de busca em km (usado apenas se `lat`/`lng` informados) |

\* `lat` e `lng` são opcionais, mas devem ser informados **juntos**. Informar apenas um dos dois retorna `400`.

**Response — 200 OK**
```json
{
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "titulo": "Amigos do Bem",
      "imagem": "https://cdn.exemplo.com/ongs/amigos-do-bem.jpg",
      "localizacao": {
        "latitude": -23.55052,
        "longitude": -46.633308
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

**Erros adicionais**
| Status | Cenário |
|---|---|
| 400 | `lat` informado sem `lng` (ou vice-versa) |
| 400 | `lat`, `lng` ou `raioKm` fora do intervalo válido |

## 8. Implementação

- Modelo: `src/models/Ong.ts` — schema Mongoose com `localizacao` (lat/long/nomeEndereco expostos na API) e um campo interno `localizacaoGeo` (GeoJSON `Point`, indexado com `2dsphere`) mantido em sincronia via hook `pre("validate")`, usado apenas para viabilizar a busca por proximidade (`$geoNear`). Esse hook só é executado em `.save()`/`Model.create()` — por isso tanto a criação (`POST /ongs`, via `Ong.create(...)`) quanto a edição (`PUT /ongs/:id`, via `Ong.findById(...)` + `.save()`) evitam updates baseados em query (`findByIdAndUpdate`/`findOneAndUpdate` não disparam o hook e deixariam `localizacaoGeo` desatualizado).
- Controller: `src/controllers/ongController.ts` — `listarOngs`, `buscarOngPorId`, `criarOng` e `atualizarOng`. `criarOng`/`atualizarOng` extraem explicitamente os campos aceitos do `req.body` (whitelist), delegam a validação de tipo/obrigatoriedade ao schema Mongoose e mapeiam `mongoose.Error.ValidationError` para `400` com mensagem citando os campos inválidos. `atualizarOng` só atribui um campo na instância se ele vier `!== undefined` no body, implementando a atualização parcial.
- Rotas: `src/routes/ongs.ts` (`GET /ongs`, `GET /ongs/:id`, `POST /ongs`, `PUT /ongs/:id`), montadas em `src/routes/index.ts`.
- Testes: `src/__tests__/ongs.spec.ts`, usando `mongodb-memory-server` para subir um MongoDB em memória (o suite existente de `health.spec.ts` não usa banco). O bloco `describe("POST /ongs", ...)` cobre o caso de sucesso (201, shape completo do recurso), a derivação de `localizacaoGeo` (verificada indiretamente via busca por proximidade) e os casos de `400` (campo obrigatório ausente e tipo inválido). O bloco `describe("PUT /ongs/:id", ...)` cobre a atualização parcial (demais campos preservados), a re-derivação de `localizacaoGeo` ao editar `localizacao` (verificada via busca por proximidade nos pontos antigo e novo), `400` para `id` inválido e para tipo inválido, e `404` para ONG inexistente.
