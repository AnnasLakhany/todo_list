'use strict'
 
const fastify = require('fastify')()
 
fastify.get('/', function (req, reply) {
 reply.send({ hello: 'world' })
 })
 
 const start = async () => {
    try {
      await fastify.listen(3000)
      fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
  start()