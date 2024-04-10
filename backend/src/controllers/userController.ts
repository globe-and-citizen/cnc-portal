import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateNonce } from "siwe";

const prisma = new PrismaClient();

const createUser = async (req: Request, res: Response) => {
    const { address } = req.body
    const nonce = generateNonce()

    try {
        if (address) {
            await prisma.user.create({
                data: {
                    address,
                    nonce
                }
            })
        
            await prisma.$disconnect()
        
            res.status(200).json({
                success: true,
                nonce
            })
        } else {
            throw Error(`address empty, please user address`)
        }
    } catch (err) {
        await prisma.$disconnect()

        res.status(500).json({
            success: false,
            message: err
        })
    }
}

export {
    createUser
}