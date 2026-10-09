import express from 'express'
import cors from 'cors'
import { authenticationController, messageController, userController } from './modules/index.js'
import { globalErrorHandler } from './middleware/index.js'
import { PORT } from './config.js'
import { bootstrapDB } from './DB/connection.db.js'
import { bootstrapRedis } from './DB/redis.connection.js'

const app = express()
await bootstrapDB(app, PORT)
await bootstrapRedis()

// middleware
app.use(cors(), express.json())

// serve uploaded assets
app.use('/assets', express.static('./assets'))

app.get('/', (req, res) => res.status(200).json({ message: 'Hello World!' }))

// app routes
app.use("/auth", authenticationController)
app.use("/message", messageController)
app.use("/user", userController)

app.all('{/*dummy}', (req, res) => { return res.status(404).json({ message: 'Route not found!' }) })

// global error handler
app.use(globalErrorHandler)
