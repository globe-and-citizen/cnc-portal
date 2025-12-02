import { Request, Response } from 'express'
import { generateNonce, SiweMessage } from 'siwe'
import jwt from 'jsonwebtoken'
import { errorResponse, extractAddressAndNonce } from '../utils/utils'
import { prisma } from '../utils'
import { AuthenticatedRequest } from '../types'

interface SiweErrorType {
  error: {
    type: string
  }
}

export const authenticateSiwe = async (req: Request, res: Response) => {
  try {
    //Get authentication and user data from request body
    const { message, signature } = req.body

    //Check if authentication and user data exists
    if (!message) return errorResponse(401, 'Auth error: Missing message', res)

    if (!signature) return errorResponse(401, 'Auth error: Missing signature', res)

    const extracted = extractAddressAndNonce(message)
    const address = extracted.address
    let nonce = extracted.nonce

    //Get nonce from user data from database
    const user = await prisma.user.findUnique({
      where: { address }
    })

    nonce = user ? user.nonce : nonce

    //Very the data
    const SIWEObject = new SiweMessage(message)

    try {
      await SIWEObject.verify({ signature, nonce })
    } catch (error) {
      return errorResponse(401, (error as SiweErrorType).error.type, res)
    }

    //Update nonce for user and persist in database
    nonce = generateNonce()

    if (user)
      await prisma.user.update({
        where: { address },
        data: { nonce }
      })
    else
      await prisma.user.create({
        data: {
          address,
          nonce
        }
      })

    await prisma.$disconnect()

    //Create JWT for the user and send to the fron-end
    const secretKey = process.env.SECRET_KEY as string
    const accessToken = jwt.sign({ address }, secretKey, { expiresIn: '24h' })

    return res.status(200).json({
      accessToken
    })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.address) {
      return errorResponse(401, 'Unauthorized: Missing jwt payload', res)
    }

    return res.status(200).json({})
  } catch (error) {
    return errorResponse(500, error, res)
  }
}
