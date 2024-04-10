import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateNonce, SiweMessage } from "siwe";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient()

const verifySiwe = async (req: Request, res: Response) => {
    try {
        const {message, signature, address} = req.body
        const user = await prisma.user.findUnique({
            where: {address}
        })

        if (!user)
            throw Error(`User not found`)

        if (message) {
            const SIWEObject = new SiweMessage(message)
            
            await SIWEObject.verify({signature, nonce: user.nonce})

            //Update nonce for user
            const nonce = generateNonce()
            await prisma.user.update({
                where: {address},
                data: {nonce}
            })

            const secretKey = process.env.SECRET_KEY as string
            const accessToken = jwt.sign({address}, secretKey, {expiresIn: "24h"})

            res.status(200).json({
                success: true,
                accessToken
            })
        } else {
            throw Error('Expected prepareMessage object as body.')
        }
        
    } catch (error) {
        await prisma.$disconnect()

        res.status(500).json({
            success: false,
            message: error
        })
    }
}

export {
    verifySiwe
}