import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { Categoria } from "../models/Categoria";

async function migrar() {
  await connectDB();

  const categorias = await Categoria.find();
  const idPorSlug = new Map(categorias.map((c) => [c.slug, c._id]));

  const ongsCollection = mongoose.connection.collection("ongs");
  const ongs = await ongsCollection.find({}).toArray();

  const naoReconhecidas: string[] = [];
  const atualizacoes: { id: mongoose.Types.ObjectId; titulo: string; novosIds: mongoose.Types.ObjectId[] }[] = [];

  for (const ong of ongs) {
    const valoresAtuais: unknown[] = ong.categorias ?? [];

    if (valoresAtuais.length > 0 && valoresAtuais.every((v) => v instanceof mongoose.Types.ObjectId)) {
      continue; // já migrada (idempotente)
    }

    const novosIds = valoresAtuais.map((valor) => {
      const id = idPorSlug.get(String(valor));
      if (!id) naoReconhecidas.push(`${ong.titulo}: "${valor}"`);
      return id as mongoose.Types.ObjectId;
    });

    atualizacoes.push({ id: ong._id, titulo: ong.titulo, novosIds });
  }

  if (naoReconhecidas.length > 0) {
    console.error("❌ Slugs não reconhecidos, abortando sem salvar:");
    naoReconhecidas.forEach((linha) => console.error(`   - ${linha}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  for (const { id, titulo, novosIds } of atualizacoes) {
    await ongsCollection.updateOne({ _id: id }, { $set: { categorias: novosIds } });
    console.log(`✅ ${titulo}: ${novosIds.length} categorias migradas`);
  }

  await mongoose.disconnect();
  console.log(`🌱 Migração concluída (${atualizacoes.length} atualizadas, ${ongs.length - atualizacoes.length} já OK).`);
}

migrar().catch((error) => {
  console.error("❌ Erro ao migrar categorias para ObjectId", error);
  process.exit(1);
});
