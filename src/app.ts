import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(routes);

export default app;