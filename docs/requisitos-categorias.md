# Documento de Requisitos — Categorias

## 1. Objetivo

Definir uma entidade própria de categoria (independente do campo livre `categorias` do `Ong`), com um conjunto pré-definido de valores, e um endpoint `GET` para listá-las — útil para popular filtros/selects no frontend sem hardcodar a lista lá.

## 2. Modelo de dados — Entidade `Categoria`

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `id` | string (ObjectId) | sim | Gerado pelo MongoDB (`_id`) |
| `nome` | string | sim | Label livre, único (ex.: "educação") |
| `slug` | string | sim | Identificador URL-friendly, único, sem acentos/espaços (ex.: "educacao") |
| `createdAt` / `updatedAt` | Date | sim | Timestamps automáticos do Mongoose |

Schema: `src/models/Categoria.ts`.

## 3. Endpoint

### `GET /categorias` — Listar categorias

**Descrição:** retorna todas as categorias pré-definidas, ordenadas por `nome`.

**Response — 200 OK**
```json
[
  { "id": "665f1a2b3c4d5e6f7a8b9c0d", "nome": "assistência social", "slug": "assistencia-social", "createdAt": "...", "updatedAt": "..." },
  { "id": "665f1a2b3c4d5e6f7a8b9c0e", "nome": "educação", "slug": "educacao", "createdAt": "...", "updatedAt": "..." }
]
```

Resposta é um array simples, sem wrapper `{ data, pagination }` (lista pequena e pré-definida, sem necessidade de paginação).

**Erros**
| Status | Cenário |
|---|---|
| 500 | Erro inesperado (ex.: falha de conexão com o banco) |

## 4. Implementação

- Modelo: `src/models/Categoria.ts` — `nome` e `slug` são `unique`.
- Controller: `src/controllers/categoriaController.ts` — `listarCategorias`.
- Rota: `src/routes/categorias.ts` (`GET /categorias`), montada em `src/routes/index.ts`.
- Seed: `src/scripts/seedCategorias.ts` (rodar via `npm run seed:categorias`) — popula as 10 categorias já usadas nos dados reais de `src/scripts/seedOngs.ts`, gerando o `slug` automaticamente a partir do `nome` (remove acentos e espaços). Usa `findOneAndUpdate` com `upsert: true` (idempotente), diferente do seed de ONGs, já que `Categoria` não tem hooks que dependam de `.save()`.
- Testes: `src/__tests__/categorias.spec.ts`, usando `mongodb-memory-server`, cobrindo lista vazia, ordenação por `nome` e o shape completo do recurso.

Fora de escopo: esta entidade não altera o model `Ong` nem valida o campo `categorias` das ONGs contra esta collection (poderia ser um follow-up futuro).
