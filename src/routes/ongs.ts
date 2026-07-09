import { Router } from "express";
import { listarOngs, buscarOngPorId, criarOng } from "../controllers/ongController";

const router = Router();

router.get("/ongs", listarOngs);
router.get("/ongs/:id", buscarOngPorId);
router.post("/ongs", criarOng);

export default router;
