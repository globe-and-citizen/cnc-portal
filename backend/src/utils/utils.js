"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = void 0;
const errorResponse = (code, error, res) => {
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
    }
    else {
        return res.status(code).json({
            success: false,
            message: "Unknown server error has occured",
        });
    }
};
exports.errorResponse = errorResponse;
