import dotenv from "dotenv"
dotenv.config({ path: "./.env" })
import connectDB from './db/index.js';
import { app } from "./app.js"

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.error(`[Server] ❌ Express error: ${error.message}`)
        throw error
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`[Server] ✅ Running on port ${process.env.PORT || 8000}`)
    })
})
.catch((error) => {
    console.error(`[DB] ❌ MongoDB connection failed: ${error.message}`)
    process.exit(1)
})
