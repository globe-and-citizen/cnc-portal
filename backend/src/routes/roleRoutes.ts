import express from "express";
import { 
    updateRole ,
    createRole,
    deleteRole
} from "../controllers/role";

const roleRouter = express.Router()

roleRouter.post('/:id', createRole)
roleRouter.put('/', updateRole)
roleRouter.delete('/:id', deleteRole)

export default roleRouter