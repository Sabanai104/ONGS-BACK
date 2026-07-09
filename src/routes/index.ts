import { Router } from "express";
import ongsRouter from "./ongs";

const router = Router();

router.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

router.use(ongsRouter);

export default router;