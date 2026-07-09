import { Router } from "express";
import { listarOngs, buscarOngPorId } from "../controllers/ongController";

const router = Router();

router.get("/ongs", listarOngs);
router.get("/ongs/:id", buscarOngPorId);

export default router;
