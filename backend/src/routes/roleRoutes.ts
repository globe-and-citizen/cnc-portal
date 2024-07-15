import express from "express";
import { 
    addRoleCategory,
    getEntitlementTypes 
} from "../controllers/roleController";

const roleRouter = express.Router()

roleRouter.post('/', addRoleCategory)
roleRouter.get('/entitlement-types', getEntitlementTypes)

export default roleRouter