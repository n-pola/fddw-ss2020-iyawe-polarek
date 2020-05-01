const amqp = require('amqplib/callback_api');
const dotenv = require('dotenv').config()
const MongoClient = require('mongodb').MongoClient
var randomNumGenerator = require("./lib/randomNumberGenerator.js")
var db_id;



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

            channel.prefetch(1);




            channel.consume(queue, (message) => {
                if (message.content) {

                    console.log(" [x] %s", message.content.toString());
                    //channel.ack(message);
                    var travel_id = generateUuid();
                    let msgJSON = JSON.parse(message.content.toString());
                    var msg = { id: travel_id, destination: msgJSON.destination, startDate: msgJSON.start_date }

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



const randomNumber = () => {
    var randomNum = Math.floor(Math.random() * 90000) + 10000;
    return randomNum
}



//creates a five digit random id for the travel Log.
function generateUuid() {
    try {
        var newNum = randomNumber()
        console.log(newNum)
        var newNumParse = { "number": newNum }

        MongoClient.connect(process.env.MONGO_BASE, { useUnifiedTopology: true }, (error, db) => {
            if (error) console.error(error);
            db_id = db.db("travel_ids")
            console.log("Connected");

            var findIDinDB = db_id.collection("ID_entries").findOne(newNumParse)
            if (findIDinDB == 30378) {
                console.log("ID already exsists. Rerolling...")
                randomNumber()
            } else {
                db_id.collection("ID_entries").insertOne(newNumParse)
                console.log("Saved the new ID ")
            }
        })

        return JSON.stringify(newNumParse.number)
    } catch (error) {
        throw error;
    }
}

