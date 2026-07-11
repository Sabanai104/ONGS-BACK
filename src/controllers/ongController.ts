import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ong } from "../models/Ong";
import { Categoria } from "../models/Categoria";
import { resolverCategoriasPorSlug } from "../utils/resolverCategorias";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_RAIO_KM = 10;

const SUMMARY_PROJECTION = {
  titulo: 1,
  imagem: 1,
  "localizacao.latitude": 1,
  "localizacao.longitude": 1
};

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

interface OngSummaryAggregate {
  _id: mongoose.Types.ObjectId;
  titulo: string;
  imagem: string;
  localizacao: { latitude: number; longitude: number };
}

function mapAggregateToSummary(doc: OngSummaryAggregate) {
  return {
    id: String(doc._id),
    titulo: doc.titulo,
    imagem: doc.imagem,
    localizacao: {
      latitude: doc.localizacao?.latitude,
      longitude: doc.localizacao?.longitude
    }
  };
}

export async function listarOngs(req: Request, res: Response) {
  try {
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

    const categoria = req.query.categoria !== undefined ? String(req.query.categoria) : undefined;
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
    const raioKm = req.query.raioKm !== undefined ? Number(req.query.raioKm) : DEFAULT_RAIO_KM;

    if ((lat !== undefined) !== (lng !== undefined)) {
      return res.status(400).json({ message: "Informe 'lat' e 'lng' juntos para busca por proximidade." });
    }
    if (lat !== undefined && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      return res.status(400).json({ message: "'lat' inválido." });
    }
    if (lng !== undefined && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      return res.status(400).json({ message: "'lng' inválido." });
    }
    if (Number.isNaN(raioKm) || raioKm <= 0) {
      return res.status(400).json({ message: "'raioKm' inválido." });
    }

    let categoriaId: mongoose.Types.ObjectId | undefined;
    if (categoria) {
      const categoriaDoc = await Categoria.findOne({ slug: categoria.toLowerCase() });
      if (!categoriaDoc) {
        return res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      categoriaId = categoriaDoc._id;
    }

    const matchFilter: Record<string, unknown> = {};
    if (categoriaId) {
      // categoriaId precisa continuar sendo um ObjectId de verdade (não string) até aqui:
      // o $geoNear abaixo roda dentro de .aggregate() e não passa pela camada de cast
      // automático do Mongoose, diferente do Ong.find() do outro branch.
      matchFilter.categorias = categoriaId;
    }

    let data: ReturnType<typeof mapAggregateToSummary>[];
    let total: number;

    if (lat !== undefined && lng !== undefined) {
      const [result] = await Ong.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanciaMetros",
            maxDistance: raioKm * 1000,
            spherical: true,
            query: matchFilter
          }
        },
        {
          $facet: {
            data: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: SUMMARY_PROJECTION }],
            total: [{ $count: "count" }]
          }
        }
      ]);

      data = (result?.data ?? []).map(mapAggregateToSummary);
      total = result?.total?.[0]?.count ?? 0;
    } else {
      total = await Ong.countDocuments(matchFilter);
      const docs = await Ong.find(matchFilter)
        .select(SUMMARY_PROJECTION)
        .skip((page - 1) * limit)
        .limit(limit);
      data = docs.map((doc) => doc.toJSON() as unknown as ReturnType<typeof mapAggregateToSummary>);
    }

    return res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar ONGs", error);
    return res.status(500).json({ message: "Erro interno ao listar ONGs." });
  }
}

export async function buscarOngPorId(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Id inválido." });
    }

    const ong = await Ong.findById(id).populate("categorias");

    if (!ong) {
      return res.status(404).json({ message: "ONG não encontrada." });
    }

    return res.json(ong.toJSON());
  } catch (error) {
    console.error("❌ Erro ao buscar ONG", error);
    return res.status(500).json({ message: "Erro interno ao buscar ONG." });
  }
}

export async function criarOng(req: Request, res: Response) {
  try {
    const {
      titulo,
      imagem,
      descricao,
      comoAjudar,
      impactosRealizados,
      localizacao,
      linkSite,
      linkInstagram,
      categorias
    } = req.body ?? {};

    const { ids: categoriaIds, naoEncontrados } = await resolverCategoriasPorSlug(categorias ?? []);
    if (naoEncontrados.length > 0) {
      return res.status(400).json({ message: `Categorias inválidas: ${naoEncontrados.join(", ")}.` });
    }

    const ong = await Ong.create({
      titulo,
      imagem,
      descricao,
      comoAjudar,
      impactosRealizados,
      localizacao: localizacao
        ? {
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            nomeEndereco: localizacao.nomeEndereco
          }
        : undefined,
      linkSite: linkSite ?? null,
      linkInstagram: linkInstagram ?? null,
      categorias: categoriaIds
    });

    await ong.populate("categorias");
    return res.status(201).json(ong.toJSON());
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const campos = Object.keys(error.errors).join(", ");
      return res.status(400).json({ message: `Campos inválidos: ${campos}.` });
    }
    console.error("❌ Erro ao criar ONG", error);
    return res.status(500).json({ message: "Erro interno ao criar ONG." });
  }
}

export async function atualizarOng(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Id inválido." });
    }

    const ong = await Ong.findById(id);

    if (!ong) {
      return res.status(404).json({ message: "ONG não encontrada." });
    }

    const {
      titulo,
      imagem,
      descricao,
      comoAjudar,
      impactosRealizados,
      localizacao,
      linkSite,
      linkInstagram,
      categorias
    } = req.body ?? {};

    if (titulo !== undefined) ong.titulo = titulo;
    if (imagem !== undefined) ong.imagem = imagem;
    if (descricao !== undefined) ong.descricao = descricao;
    if (comoAjudar !== undefined) ong.comoAjudar = comoAjudar;
    if (impactosRealizados !== undefined) ong.impactosRealizados = impactosRealizados;
    if (localizacao !== undefined) {
      ong.localizacao = {
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        nomeEndereco: localizacao.nomeEndereco
      };
    }
    if (linkSite !== undefined) ong.linkSite = linkSite;
    if (linkInstagram !== undefined) ong.linkInstagram = linkInstagram;
    if (categorias !== undefined) {
      const { ids: categoriaIds, naoEncontrados } = await resolverCategoriasPorSlug(categorias);
      if (naoEncontrados.length > 0) {
        return res.status(400).json({ message: `Categorias inválidas: ${naoEncontrados.join(", ")}.` });
      }
      ong.categorias = categoriaIds;
    }

    await ong.save();
    await ong.populate("categorias");

    return res.json(ong.toJSON());
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const campos = Object.keys(error.errors).join(", ");
      return res.status(400).json({ message: `Campos inválidos: ${campos}.` });
    }
    console.error("❌ Erro ao atualizar ONG", error);
    return res.status(500).json({ message: "Erro interno ao atualizar ONG." });
  }
}

export async function deletarOng(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Id inválido." });
    }

    const ong = await Ong.findByIdAndDelete(id);

    if (!ong) {
      return res.status(404).json({ message: "ONG não encontrada." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("❌ Erro ao deletar ONG", error);
    return res.status(500).json({ message: "Erro interno ao deletar ONG." });
  }
}
