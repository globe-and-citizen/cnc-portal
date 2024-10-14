import express from "express";
import { 
    addRoleCategory,
    updateRoleCategory,
    getRoleCategories,
    getRoleCategory,
    deleteRoleCategory
} from "../controllers/role";

const roleCategoryRouter = express.Router()

roleCategoryRouter.post('/', addRoleCategory)
roleCategoryRouter.get('/', getRoleCategories)
roleCategoryRouter.get('/:id', getRoleCategory)
roleCategoryRouter.put('/', updateRoleCategory)
roleCategoryRouter.delete('/:id', deleteRoleCategory)

export default roleCategoryRouter