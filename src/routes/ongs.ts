import { Router } from "express";
import { listarOngs, buscarOngPorId, criarOng, atualizarOng } from "../controllers/ongController";

const router = Router();

router.get("/ongs", listarOngs);
router.get("/ongs/:id", buscarOngPorId);
router.post("/ongs", criarOng);
router.put("/ongs/:id", atualizarOng);

export default router;
