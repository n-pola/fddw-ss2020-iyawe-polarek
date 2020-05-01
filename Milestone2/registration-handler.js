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


            
            
            channel.consume(queue, (message) => {
                if (message.content) {
                    channel.prefetch(1)
                    console.log(" [x] %s", message.content.toString());
                    //channel.ack(message);

                    let msgJSON = JSON.parse(message.content.toString());
                    var msg = { id: travel_id, destination: msgJSON.destination }

                    channel.assertExchange(exchange, 'direct', {
                        durable: true
                    })

                    channel.publish(exchange, 'weather.location', Buffer.from(JSON.stringify(msg)))
                    console.log(`sent: ${JSON.stringify(msg)} `)

                    channel.publish(exchange, 'traffic.route', Buffer.from(JSON.stringify(msg)))
                    console.log(`sent: ${JSON.stringify(msg)}  `)

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

