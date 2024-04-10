import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    // Extract the authorization header (optional)
    const authHeader = req.headers.authorization;
  
    // Check if authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            success: false, 
            message: 'Unauthorized: Missing authorization header' 
        });
    }
  
    // Split the header to separate scheme and token (if present)
    const parts = authHeader.split(' ');
  
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ 
            success: false,
            message: 'Invalid authorization format' 
        });
    }
  
    // Extract the token from the second part
    const token = parts[1];
  
    const secretKey = process.env.SECRET_KEY as string

    jwt.verify(token, secretKey, (error, payload) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }

        if (payload)
            (req as any).address = (payload as any).address
        else 
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Missing jwt payload"
            })
    })
  
    next();
};

export {
    authenticateToken
}