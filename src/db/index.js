import dns from "node:dns";
import mongoose from "mongoose"
import {DB_NAME} from '../constants.js'
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const connectDB = async ()=>{
    try{
        const mongoUri = process.env.MONGODB_URI
        const connectionInstance = await mongoose.connect(`${mongoUri}/${DB_NAME}`)
        console.log(`\n MongoDB connected || DB HOST : ${connectionInstance.connection.host}`)
    }
    catch(error){
        console.error("MONGODB CONNECTION ERROR", error)
        process.exit(1)
    }
}
export default connectDB
