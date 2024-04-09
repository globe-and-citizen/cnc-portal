import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import teamRoutes from "./routes/teamRoutes";
import memberRoutes from "./routes/memberRoutes";
const path = require("path");

import { generateDocs } from "./utils/swagger";
const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());

app.use(teamRoutes);
app.use(memberRoutes);
const port = parseInt(process.env.PORT as string) || 3000;
app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname + "/utils/backend_specs.html"));
});
generateDocs();
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});
