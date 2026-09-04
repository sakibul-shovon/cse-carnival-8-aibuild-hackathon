import cors from 'cors'
import express from 'express'
import 'dotenv/config'
import healthRoutes from './routes/healthRoutes.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(cors())
app.use(express.json())
app.use('/health', healthRoutes)

app.use((request, response) => {
  response.status(404).json({ error: `Route not found: ${request.method} ${request.path}` })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

app.listen(port, () => {
  console.log(`CampusOS backend listening on port ${port}`)
})
