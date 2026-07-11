import { Types } from "mongoose";
import { Categoria } from "../models/Categoria";

export async function resolverCategoriasPorSlug(slugs: string[]) {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return { ids: [] as Types.ObjectId[], naoEncontrados: [] as string[] };
  }
  const slugsUnicos = [...new Set(slugs)];
  const categorias = await Categoria.find({ slug: { $in: slugsUnicos } });
  const idPorSlug = new Map(categorias.map((c) => [c.slug, c._id]));
  const naoEncontrados = slugsUnicos.filter((slug) => !idPorSlug.has(slug));
  const ids = slugsUnicos.filter((slug) => idPorSlug.has(slug)).map((slug) => idPorSlug.get(slug) as Types.ObjectId);
  return { ids, naoEncontrados };
}
