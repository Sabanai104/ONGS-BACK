import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { Categoria } from "../models/Categoria";

function slugify(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const nomesCategorias = [
  "combate à fome",
  "educação",
  "assistência social",
  "saúde",
  "inclusão de pessoas com deficiência",
  "combate ao câncer infantil",
  "meio ambiente",
  "conservação",
  "combate à pobreza",
  "conservação da biodiversidade"
];

async function seed() {
  await connectDB();

  for (const nome of nomesCategorias) {
    const slug = slugify(nome);
    await Categoria.findOneAndUpdate(
      { nome },
      { nome, slug },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    console.log(`✅ ${nome}`);
  }

  await mongoose.disconnect();
  console.log(`🌱 Seed concluído (${nomesCategorias.length} categorias).`);
}

seed().catch((error) => {
  console.error("❌ Erro ao popular categorias", error);
  process.exit(1);
});
