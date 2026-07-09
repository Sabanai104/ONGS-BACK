import { Router } from "express";
import ongsRouter from "./ongs";
import categoriasRouter from "./categorias";

const router = Router();

router.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

router.use(ongsRouter);
router.use(categoriasRouter);

export default router;