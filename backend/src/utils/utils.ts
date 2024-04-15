import { Response } from "express";

export const errorResponse = (code: number, error: any, res: Response) => {
  if (typeof error === "string")
    return res.status(code).json({
      success: false,
      message: error,
    });
  else if (error instanceof Error) {
    return res.status(code).json({
      success: false,
      message: error.message,
    });
  } else {
    return res.status(code).json({
      success: false,
      message: "Unknown server error has occured",
    });
  }
};
