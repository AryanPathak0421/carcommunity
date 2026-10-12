import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { corsOriginCheck } from './config/security.js'

const app = express()

// Behind nginx/a load balancer the client IP comes from X-Forwarded-For (needed for rate limiting).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
else if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: corsOriginCheck,
    credentials: true,
  }),
)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '4mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'carcommunity-api' })
})

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
