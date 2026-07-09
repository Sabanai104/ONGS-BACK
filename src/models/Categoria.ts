import { Schema, model } from "mongoose";

export interface ICategoria {
  nome: string;
  slug: string;
}

const CategoriaSchema = new Schema<ICategoria>(
  {
    nome: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Categoria = model<ICategoria>("Categoria", CategoriaSchema);
