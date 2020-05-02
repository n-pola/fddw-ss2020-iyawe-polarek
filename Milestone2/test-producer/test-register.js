var doetenv = require('dotenv').config()
var amqp = require('amqplib/callback_api')

amqp.connect(process.env.AMQP_URL, (error0, conntection) => {
    if (error0) {
        console.error(error0.message);
    }
    conntection.createChannel((error1, channel) => {
        if (error1) {
            console.error(error1.message)
        }


        var queue = "register_queue"
        var message = { "start_date": "2020.05.01", "end_date": "2020.05.04", "destination": "Soelden" }

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)))
        console.log(`sent ${JSON.stringify(message)} to ${queue}`)

    })
}

)

