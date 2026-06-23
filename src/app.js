import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({//for json data
    limit: "16kb"
}))
app.use(express.urlencoded({//for url data
    extended: true,
    limit: "16kb"
}))
app.use(express.static("public"))//for imagees store inpublic folder
app.use(cookieParser())

//routes
import Userrouter from "./routes/user.route.js" 

//routes declaration
app.use("/api/v1/users", Userrouter)

export { app };