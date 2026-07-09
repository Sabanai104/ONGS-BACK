import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ong } from "../models/Ong";

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    const matchFilter: Record<string, unknown> = {};
    if (categoria) {
      matchFilter.categorias = { $regex: new RegExp(`^${escapeRegex(categoria)}$`, "i") };
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

    const ong = await Ong.findById(id);

    if (!ong) {
      return res.status(404).json({ message: "ONG não encontrada." });
    }

    return res.json(ong.toJSON());
  } catch (error) {
    console.error("❌ Erro ao buscar ONG", error);
    return res.status(500).json({ message: "Erro interno ao buscar ONG." });
  }
}
