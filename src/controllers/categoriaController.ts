import { Request, Response } from "express";
import { Categoria } from "../models/Categoria";

export async function listarCategorias(req: Request, res: Response) {
  try {
    const categorias = await Categoria.find().sort({ nome: 1 });
    return res.json(categorias.map((categoria) => categoria.toJSON()));
  } catch (error) {
    console.error("❌ Erro ao listar categorias", error);
    return res.status(500).json({ message: "Erro interno ao listar categorias." });
  }
}
