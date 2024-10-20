import consola from 'consola'
import { app } from '@/app'

const port =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_PORT || 4000
    : process.env.PORT || 3000

app.listen(port, () => {
  consola.info(`🚀 Server ready at: http://localhost:${port}`)
  consola.info(`🚀 Swagger docs ready at: http://localhost:${port}/api-docs`)
})
