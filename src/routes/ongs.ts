import { Router } from "express";
import { listarOngs, buscarOngPorId, criarOng, atualizarOng, deletarOng } from "../controllers/ongController";

const router = Router();

router.get("/ongs", listarOngs);
router.get("/ongs/:id", buscarOngPorId);
router.post("/ongs", criarOng);
router.put("/ongs/:id", atualizarOng);
router.delete("/ongs/:id", deletarOng);

export default router;
