import { Router } from "express";
import { listarCategorias } from "../controllers/categoriaController";

const router = Router();

router.get("/categorias", listarCategorias);

export default router;
