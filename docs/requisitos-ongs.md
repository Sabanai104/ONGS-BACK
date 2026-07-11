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
- Endpoint `DELETE /ongs/:id` (remoção).
- Validações e tratamento de erros dos endpoints.

Fora do escopo deste documento:
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
| `categorias` | ObjectId[] (ref `Categoria`) | sim | não | sim | Referência real a `Categoria` (ver `docs/requisitos-categorias.md`). Na entrada (`POST`/`PUT`) aceita array de `slug`s (ex.: `["educacao", "meio-ambiente"]`), resolvidos para `_id` no servidor. Na saída, vem populado como array de objetos `{id, nome, slug, createdAt, updatedAt}` |
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
    categorias: { type: [{ type: Schema.Types.ObjectId, ref: "Categoria" }], required: true, default: [] }
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
  - `categoria` — filtra por categoria (espera o `slug`, ex.: `saude`, não o nome livre)
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
  "categorias": [
    { "id": "665f1a2b3c4d5e6f7a8b9c10", "nome": "combate à fome", "slug": "combate-a-fome", "createdAt": "...", "updatedAt": "..." },
    { "id": "665f1a2b3c4d5e6f7a8b9c11", "nome": "assistência social", "slug": "assistencia-social", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

`categorias` vem sempre populada (via `.populate("categorias")`) — nunca como `ObjectId` bruto.

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
  "categorias": ["combate-a-fome", "assistencia-social"]
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
| `categorias` | não | default `[]` se omitido; array de `slug`s (ex.: `["educacao"]`), resolvidos para `_id` de `Categoria` no servidor antes de gravar |

**Response — 201 Created**

Retorna o recurso criado, no mesmo formato de `GET /ongs/:id` (ver 4.2) — incluindo `id`, `createdAt`, `updatedAt` e `categorias` já **populada** como array de objetos (não os slugs enviados).

**Regras de negócio**
- Apenas os campos listados na tabela acima são aceitos do corpo da requisição; qualquer outro campo enviado (ex.: `localizacaoGeo`, `id`) é ignorado.
- `localizacaoGeo` (GeoJSON usado na busca por proximidade, ver seção 8) nunca é aceito do cliente — é sempre derivado no servidor a partir de `localizacao.latitude`/`longitude`.
- A validação de obrigatoriedade e tipos é feita pelo schema Mongoose (`Ong.create(...)`); qualquer violação retorna `400`.
- Cada slug de `categorias` é resolvido para o `_id` da `Categoria` correspondente (ver `docs/requisitos-categorias.md`) antes de gravar; qualquer slug não reconhecido retorna `400` sem gravar nada.

**Erros**
| Status | Cenário |
|---|---|
| 400 | Campo obrigatório ausente (ex.: `titulo`, `localizacao`) |
| 400 | Campo com tipo inválido (ex.: `localizacao.latitude` não numérico) |
| 400 | `categorias` contém um slug que não existe em `Categoria` |
| 500 | Erro inesperado (ex.: falha de conexão com o banco) |

A mensagem de erro em `400` de validação de campo lista os campos inválidos, ex.: `{ "message": "Campos inválidos: titulo, localizacao.latitude." }`. Slugs de `categorias` não encontrados usam uma mensagem própria, listando os slugs: `{ "message": "Categorias inválidas: slug-que-nao-existe." }`.

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
| `categorias` | Se enviado, substitui a lista inteira; array de `slug`s, resolvidos para `_id` de `Categoria` no servidor |

**Response — 200 OK**

Retorna o recurso atualizado, no mesmo formato de `GET /ongs/:id` (ver 4.2) — `categorias` vem populada como array de objetos.

**Regras de negócio**
- Apenas os mesmos campos aceitos por `POST /ongs` são lidos do body (whitelist); qualquer outro campo enviado (ex.: `localizacaoGeo`, `id`) é ignorado.
- Campos omitidos no body preservam o valor atual da ONG (atualização parcial, não substituição completa).
- Se `localizacao` for enviada, `localizacaoGeo` é automaticamente recalculado no servidor a partir do novo `latitude`/`longitude` (ver seção 8).
- A validação de tipos é feita pelo schema Mongoose; qualquer violação retorna `400`.
- Cada slug de `categorias` é resolvido para o `_id` da `Categoria` correspondente antes de gravar; qualquer slug não reconhecido retorna `400` sem alterar nada.

**Erros**
| Status | Cenário |
|---|---|
| 400 | `id` com formato inválido |
| 400 | Campo com tipo inválido (ex.: `localizacao.latitude` não numérico) |
| 400 | `categorias` contém um slug que não existe em `Categoria` |
| 404 | ONG não encontrada |
| 500 | Erro inesperado |

A mensagem de erro em `400` de validação de campo lista os campos inválidos, no mesmo formato de `POST /ongs`; slugs de `categorias` não encontrados usam a mensagem própria descrita em 4.3.

---

### 4.5 `DELETE /ongs/:id` — Remover ONG

**Descrição:** remove definitivamente uma ONG.

**Request**
- Método: `DELETE`
- Path: `/ongs/:id`
- Path param: `id` — ObjectId da ONG

**Response — 204 No Content**

Sem corpo na resposta.

**Erros**
| Status | Cenário |
|---|---|
| 400 | `id` com formato inválido |
| 404 | ONG não encontrada |
| 500 | Erro inesperado |

## 5. Requisitos não funcionais

- Endpoints devem responder com `Content-Type: application/json`.
- Estrutura de rotas deve seguir o padrão já existente em `src/routes/index.ts` (Express Router).
- Modelo deve seguir o padrão já existente em `src/models/User.ts` (Mongoose Schema + `model()`).
- Cobertura de testes (Jest + Supertest) para os cinco endpoints, incluindo os casos de erro (400/404) e o caso de lista vazia.

## 6. Perguntas em aberto (respondidas)

- **Paginação:** implementada já na primeira versão. `GET /ongs` aceita `page` (default `1`) e `limit` (default `10`, máximo `50`) e retorna metadados de paginação (`total`, `totalPages`) junto aos dados — ver seção 4.1 atualizada.
- **`linkSite`/`linkInstagram` ausentes:** retornam `null` (nunca omitidos, nunca string vazia).
- **Busca/filtro:** implementados na primeira versão, ambos como query params de `GET /ongs` (sem necessidade de rota separada):
  - `categoria` — resolve o `slug` informado (case-insensitive) para o `_id` da `Categoria` correspondente e filtra ONGs cuja lista de `categorias` contenha essa referência. Slug inexistente retorna lista vazia (`200`), não erro — mesmo comportamento de "sem resultados" de qualquer outro filtro que não encontra nada.
  - `lat` + `lng` + `raioKm` (opcional, default `10`) — busca por proximidade geográfica, retornando apenas ONGs dentro do raio informado a partir do ponto informado. `lat` e `lng` devem ser informados juntos (400 se apenas um for enviado). A ordenação, quando essa busca é usada, é por distância crescente até o ponto de referência.

## 7. Atualização da seção 4.1 — `GET /ongs` (com paginação e busca)

**Query params**

| Param | Obrigatório | Default | Descrição |
|---|---|---|---|
| `page` | não | `1` | Página atual (mínimo 1) |
| `limit` | não | `10` | Itens por página (máximo 50) |
| `categoria` | não | — | Filtra ONGs que possuam esse `slug` de categoria (case-insensitive) |
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
- `categorias` no `Ong` é um array de referências reais (`{ type: Schema.Types.ObjectId, ref: "Categoria" }`), não mais strings. Um validador assíncrono no schema confere se cada `_id` realmente existe em `Categoria` (`Categoria.countDocuments({ _id: { $in: ids } })`) — defesa em profundidade para qualquer código que grave em `Ong` diretamente sem passar pelo controller (ex.: `seedOngs.ts`), já que sem essa checagem uma referência quebrada só apareceria depois, como `null` dentro do array populado no `GET`.
- `src/utils/resolverCategorias.ts` (`resolverCategoriasPorSlug`) — helper compartilhado por `criarOng`, `atualizarOng` e `seedOngs.ts`: recebe um array de `slug`s e retorna os `_id`s correspondentes mais a lista dos que não foram encontrados. O contrato de entrada da API (`POST`/`PUT`) continua sendo slugs — a resolução para `_id` acontece só no servidor, antes de gravar. As leituras (`GET /ongs/:id`, e as respostas de `POST`/`PUT`) usam `.populate("categorias")`, que aplica automaticamente o `toJSON.transform` da própria `Categoria` (ver `docs/requisitos-categorias.md`), produzindo `{id, nome, slug, createdAt, updatedAt}` sem nenhum código extra no lado do `Ong`.
- No filtro `?categoria=` de `GET /ongs`, o `_id` resolvido precisa continuar sendo um `ObjectId` de verdade (não string) até chegar tanto no `Ong.find()` quanto no `$geoNear` da agregação usada na busca por proximidade — `.aggregate()` não passa pela camada de cast automático do Mongoose, então se esse `_id` virasse string em algum refactor futuro, a busca geográfica combinada com filtro de categoria pararia de encontrar qualquer resultado, silenciosamente.
- **Migração de dados (já executada)**: como `categorias` deixou de ser `string[]` de slugs para ser `ObjectId[]`, os documentos de `Ong` já existentes precisaram ser migrados **antes** do schema novo entrar em vigor — ler um documento com `categorias` ainda em formato string através do schema novo lança `CastError`. `src/scripts/migrarCategoriasParaObjectId.ts` (`npm run migrate:categorias-objectid`) faz essa conversão usando o driver bruto do Mongo (não o model `Ong`), para garantir que o tipo BSON gravado seja `ObjectId` de verdade (gravar uma hex-string através do schema antigo deixaria o tipo armazenado como `string`, quebrando silenciosamente comparações type-sensitive como a do `$geoNear`). Essa é a invariante real a respeitar em qualquer novo ambiente/deploy: a migração precisa rodar contra o banco **antes** do código com o schema novo (`categorias: ObjectId[]`) começar a servir tráfego — não é só uma questão de ordem de commit no git. Se este projeto vier a ser implantado no Fly.io (`fly.toml` já preparado), vale considerar um `release_command` apontando para o script compilado, para que a migração rode automaticamente antes de qualquer deploy trocar o tráfego para a nova versão.
- `src/scripts/seedOngs.ts` usa `resolverCategoriasPorSlug` para resolver os slugs declarados em `ongsSeed` para `_id`s antes de gravar, e lança um erro explícito (listando todos os slugs não encontrados de uma vez) se `npm run seed:categorias` ainda não tiver rodado.
- `src/utils/slugify.ts` — função de normalização (remove acentos, minúsculas, hífen) usada por `seedCategorias.ts`.
- Controller: `src/controllers/ongController.ts` — `listarOngs`, `buscarOngPorId`, `criarOng`, `atualizarOng` e `deletarOng`. `criarOng`/`atualizarOng` extraem explicitamente os campos aceitos do `req.body` (whitelist), delegam a validação de tipo/obrigatoriedade ao schema Mongoose e mapeiam `mongoose.Error.ValidationError` para `400` com mensagem citando os campos inválidos. `atualizarOng` só atribui um campo na instância se ele vier `!== undefined` no body, implementando a atualização parcial. `deletarOng` usa `Ong.findByIdAndDelete(id)` (não precisa disparar o hook `pre("validate")`, já que remoção não envolve validação de schema) e retorna `204` sem corpo.
- Rotas: `src/routes/ongs.ts` (`GET /ongs`, `GET /ongs/:id`, `POST /ongs`, `PUT /ongs/:id`, `DELETE /ongs/:id`), montadas em `src/routes/index.ts`.
- Testes: `src/__tests__/ongs.spec.ts`, usando `mongodb-memory-server` para subir um MongoDB em memória (o suite existente de `health.spec.ts` não usa banco). O `beforeAll` seeda duas `Categoria`s fixas (`educacao`, `saude`) reaproveitadas em todos os testes que precisam de uma categoria válida. O bloco `describe("POST /ongs", ...)` cobre o caso de sucesso (201, shape completo do recurso com `categorias` populada), a derivação de `localizacaoGeo` (verificada indiretamente via busca por proximidade), os casos de `400` (campo obrigatório ausente, tipo inválido) e `400` para slug de categoria inexistente. O bloco `describe("PUT /ongs/:id", ...)` cobre a atualização parcial (demais campos preservados), a re-derivação de `localizacaoGeo` ao editar `localizacao`, `400`/`404` de formato/existência e `400` para slug de categoria inexistente. O bloco `describe("DELETE /ongs/:id", ...)` cobre a remoção (204, documento removido do banco), `400` e `404`. Em `describe("GET /ongs", ...)`, além do filtro básico por `categoria`, há testes específicos para slug de categoria inexistente (lista vazia, não erro) e para o filtro `categoria` combinado com busca geográfica (`lat`/`lng`) — esse último cobre especificamente o `$geoNear`, que não passa pela camada de cast do Mongoose e por isso é o ponto mais frágil da migração para `ObjectId`.
