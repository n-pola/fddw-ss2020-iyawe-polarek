var amqp = require('amqplib/callback_api');
var dotenv = require('dotenv').config()
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_BASE, { useNewUrlParser: true, useUnifiedTopology: true }).catch(
    (error) => console.log(JSON.stringify(error))
)
const db = mongoose.connection
db.on('error', (error) => console.error(error))
db.once('open', () => console.log('connected to database'))


registrationHandler()



async function registrationHandler() {
    amqp.connect(process.env.AMQP_URL, (error0, connection) => {
        if (error0) {
            console.error(error0.message);
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                console.error(error1.message)
            }

            console.log('Connection stable');
            var queue = "register_queue"

            //created an exchange between Registration Handler and the (traffic, weather) queues stop direct routing between the registration handler.
            var exchange = "registration_exchange";
            var travel_id = generateUuid();
            var message = { start_date: Date(21), end_date: Date(21), destination: "Berlin", travel_id: travel_id };


            channel.assertExchange(exchange, 'direct', {
                durable: true
            })

            channel.publish(exchange, 'weather.location', Buffer.from(message.travel_id), Buffer.from(message.destination), {
                correlationId: travel_id
            })
            console.log(`sent: ${message.travel_id} and ${message.destination} `)

            channel.publish(exchange, 'traffic.route', Buffer.from(message.travel_id), Buffer.from(message.destination), {
                correlationId: travel_id
            })
            console.log(`sent: ${message.travel_id} and ${message.destination}`)


            channel.assertQueue(queue, {
                exclusive: true
            }, (error2, queue) => {
                if (error2) console.error(error1.message)
            })

            channel.consume(queue, (message) => {
                if (message.content) {
                    console.log(" [x] %s", msg.content.toString())
                }
            })
        })


    })
}

function sendIdToDb(id) {

}

//creates a five digit random id for the travel Log.
function generateUuid() {
    return (
        (Math.floor(Math.random() * 90000) + 10000).toString()
    );
}

