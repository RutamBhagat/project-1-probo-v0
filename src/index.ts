import consola from 'consola'
import { app } from './app'

app.listen(3000, () =>
  consola.info(`🚀 Server ready at: http://localhost:3000`)
)
