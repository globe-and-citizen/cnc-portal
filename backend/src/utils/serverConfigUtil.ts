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

export const errorMessages = {
    frontendUrl: `
        Required environment variable 'FRONTEND_URL' not set.
        e.g In you .env file add the line FRONTEND_URL=http://localhost:5173
    `,
    databaseUrl:  `
        Required environment variable 'DATABASE_URL' not set.
        e.g In you .env file add the line DATABASE_URL=postgres://username:password@localhost:5432/database_name
    `,
    secretKey:  `
        Required environment variable 'SECRET_KEY' not set.
        e.g In you .env file add the line SECRET_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a1b
    `,
    nodeEnv:  `
        Required environment variable 'NODE_ENV' not set.
        e.g In you .env file add the line NODE_ENV=development
    `
}