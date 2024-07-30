import express from "express";
import { getEntitlementTypes } from "../controllers/role";

const entitlementRouter = express.Router()

entitlementRouter.get('/types', getEntitlementTypes)

export default entitlementRouter