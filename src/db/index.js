import mongoose from "mongoose"
import { DB_NAME } from '../constants.js'

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`[DB] ✅ MongoDB connected | Host: ${connectionInstance.connection.host}`)
    }
    catch (error) {
        console.error(`[DB] ❌ Connection error: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB
