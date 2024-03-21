import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import router from "./routes/index";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());

app.use(router);

const port = parseInt(process.env.PORT as string) || 3000;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});
