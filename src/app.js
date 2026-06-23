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
import subscriptionRouter from "./routes/subscription.route.js"
import videoRouter from "./routes/video.route.js"
import commentRouter from "./routes/comment.route.js"
import likeRouter from "./routes/like.route.js"
import playlistRouter from "./routes/playlist.route.js"
import dashboardRouter from "./routes/dashboard.route.js"

//routes declaration
app.use("/api/v1/users", Userrouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

export { app };