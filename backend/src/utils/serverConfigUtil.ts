type Origin = string | undefined
type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[]
type CorsCallback = (err: Error | null, origin?: StaticOrigin) => void

const validateOrigin = (origin: Origin, callback: CorsCallback) => {
    const frontendUrl = process.env.FRONTEND_URL
    console.log("[src][utils][serverConfigUtil.ts][validateOrigin] origin: ", origin)
    if (!frontendUrl) {
        //If the FRONTEND_URL is not set, throw an error
        const msg = `The environment variable FRONTEND_URL is not set. 
            Please set it to allow CORS`
        return callback(new Error(msg), false)
    }

    if (origin !== frontendUrl) {
        //If the origin does not match the FRONTEND_URL, throw an error
        const msg = `The CORS policy for this site allow access from 
            ${origin}.`
        return callback(new Error(msg), false)
    }

    return callback(null, true)
}

export const corsOptions = {
    origin: validateOrigin,
    optionsSuccessStatus: 200
}