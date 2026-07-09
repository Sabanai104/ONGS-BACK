import { Schema, model } from "mongoose";

interface ILocalizacao {
  latitude: number;
  longitude: number;
  nomeEndereco: string;
}

interface IGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface IOng {
  titulo: string;
  imagem: string;
  descricao: string;
  comoAjudar: string;
  impactosRealizados: string;
  localizacao: ILocalizacao;
  localizacaoGeo: IGeoPoint;
  linkSite: string | null;
  linkInstagram: string | null;
  categorias: string[];
}

const LocalizacaoSchema = new Schema<ILocalizacao>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    nomeEndereco: { type: String, required: true }
  },
  { _id: false }
);

const OngSchema = new Schema<IOng>(
  {
    titulo: { type: String, required: true },
    imagem: { type: String, required: true },
    descricao: { type: String, required: true },
    comoAjudar: { type: String, required: true },
    impactosRealizados: { type: String, required: true },
    localizacao: { type: LocalizacaoSchema, required: true },
    localizacaoGeo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }
    },
    linkSite: { type: String, default: null },
    linkInstagram: { type: String, default: null },
    categorias: { type: [String], required: true, default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: any) => {
        delete ret._id;
        delete ret.__v;
        delete ret.localizacaoGeo;
        return ret;
      }
    }
  }
);

// Mantém localizacaoGeo (GeoJSON) sincronizado com localizacao.latitude/longitude
// para viabilizar buscas por proximidade via $geoNear, mesmo a API expondo lat/long separados.
OngSchema.pre("validate", function () {
  if (this.localizacao) {
    this.localizacaoGeo = {
      type: "Point",
      coordinates: [this.localizacao.longitude, this.localizacao.latitude]
    };
  }
});

OngSchema.index({ localizacaoGeo: "2dsphere" });

export const Ong = model<IOng>("Ong", OngSchema);
