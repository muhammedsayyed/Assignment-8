import express from 'express'
import { authenticationController, messageController, userController } from './modules/index.js'
import { globalErrorHandler } from './middleware/index.js'
import { PORT } from './config.js'
import { bootstrapDB } from './DB/connection.db.js'
import { bootstrapRedis } from './DB/redis.connection.js'

// create express app and connect to database
const app = express()
bootstrapDB(app, PORT)
bootstrapRedis()
app.use(express.json())

// home route
app.get('/', (req, res) => res.status(200).json({message: 'Hello World!'})) 

// mount the routers
app.use("/auth", authenticationController) 
app.use("/message", messageController)
app.use("/user", userController)

// handle unknown routes
app.all('{/*dummy}', (req, res) => {return res.status(404).json({message: 'Route not found!'})})

// global error handler
app.use(globalErrorHandler)
