const amqp = require('amqplib/callback_api');
const dotenv = require('dotenv').config()
const MongoClient = require('mongodb').MongoClient
var db_id;





MongoClient.connect(process.env.MONGO_BASE, { useUnifiedTopology: true }, (error, db) => {
    if (error) console.error(error);
    db_id = db.db("travel_ids")
    console.log("Connected");

    registrationHandler()
})
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

            channel.prefetch(1);


            channel.consume(queue, (message) => {
                if (message.content) {

                    console.log(" [x] %s", message.content.toString());
                    var travel_id = generateUuid();
                    let msgJSON = JSON.parse(message.content.toString());
                    var msg = { id: travel_id, destination: msgJSON.destination, startDate: msgJSON.start_date }

                    channel.assertExchange(exchange, 'direct', {
                        durable: true
                    })

                    channel.publish(exchange, `${travel_id}.register`, Buffer.from(JSON.stringify(msg)))
                    console.log(`sent: ${JSON.stringify(msg)} `)


                }
            })
        })


    })
}

//creates a five digit random id for the travel Log.
function generateUuid() {
    var id = Math.floor(Math.random() * 90000) + 10000;

    db_id.collection("ID_entries").findOne({ number: id }, function (err, result) {
        if (result != null) {
            id = generateUuid();

        } else {
            db_id.collection("ID_entries").insertOne({ number: id }, function (err, res) { });
        }
    });

    return id;

}


