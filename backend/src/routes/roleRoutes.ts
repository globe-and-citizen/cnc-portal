import express from "express";
import { 
    addRoleCategory,
    updateRoleCategory,
    getEntitlementTypes,
    getRoleCategories,
    getRoleCategory,
    updateRole ,
    createRole,
    deleteRole,
    deleteRoleCategory
} from "../controllers/role";

const roleRouter = express.Router()

roleRouter.post('/:id', createRole)
roleRouter.put('/', updateRole)
roleRouter.delete('/:id', deleteRole)
roleRouter.post('/role-category', addRoleCategory)
roleRouter.get('/role-category', getRoleCategories)
roleRouter.get('/role-category/:id', getRoleCategory)
roleRouter.put('/role-category', updateRoleCategory)
roleRouter.delete('/role-category/:id', deleteRoleCategory)
roleRouter.get('/entitlement-types', getEntitlementTypes)

export default roleRouter