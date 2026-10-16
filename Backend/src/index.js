// for server
import dotenv from "dotenv";
import http from "http";
import connectDB from "./db/index.js";
import { app } from './app.js';
import { initializeSocket } from "./socket.js";

dotenv.config({
    path:"./env"
})

// Create a raw HTTP server wrapping the Express app, instead of letting
// app.listen() create one implicitly — Socket.io needs direct access to
// this same server so it can share the same port as your REST API.
const httpServer = http.createServer(app);

// Wires up Socket.io on top of the same server.
initializeSocket(httpServer);

connectDB()
.then(()=>{
    httpServer.listen(process.env.port || 8000,()=>{
        console.log(`Server is running at port :${process.env.port}`)
    })
    app.on("error",(error)=>{
        console.log("Can't talk to database",error);
        throw error
    })
})
.catch((err)=>{
    console.log("DB connection failed ",err);
})