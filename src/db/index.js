import mongoose from "mongoose"
import { DB_NAME } from '../constants.js'

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI
        const [baseUri, queryString] = uri.split("?")
        const cleanBase = baseUri.endsWith("/") ? baseUri.slice(0, -1) : baseUri
        const finalUri = queryString
            ? `${cleanBase}/${DB_NAME}?${queryString}`
            : `${cleanBase}/${DB_NAME}`

        const connectionInstance = await mongoose.connect(finalUri)
        console.log(`[DB] ✅ MongoDB connected | Host: ${connectionInstance.connection.host}`)
    }
    catch (error) {
        console.error(`[DB] ❌ Connection error: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB
