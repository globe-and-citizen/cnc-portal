import express from "express";
import { generateNonce } from "siwe";

import {
  addCompany,
  updateCompany,
  deleteCompany,
  getCompany,
  getAllCompanies,
  deleteEmployee,
  updateEmployee,
  addEmployees,
} from "../controllers/companyController";

const router = express.Router();

// export default router;
router.get("/nonce", async function (req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.send(generateNonce());
});

// Team Controller
router.post("/companies", addCompany);
router.get("/companies", getAllCompanies);
router.post("/companies/:id", getCompany);
router.put("/companies/:id", updateCompany);
router.delete("/companies/:id", deleteCompany);
router.delete("/employee/:id", deleteEmployee);
router.put("/employee/:id", updateEmployee);
router.post("/employee/:id", addEmployees);

export default router;
