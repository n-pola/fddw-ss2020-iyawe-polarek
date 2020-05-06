require("dotenv").config();
const amqp = require("amqplib/callback_api");
const weatherFormatter = require("./lib/weatherFormatter")
const carCounter = require("./lib/carCounter")
const topicLister = require("./lib/carTopicLister")
const MongoClient = require("mongodb").MongoClient;
var dbo;

MongoClient.connect(process.env.MONGO_BASE, { useUnifiedTopology: true },
    (error, db) => {
        if (error) console.error(error);
        dbo = db.db('combineData');
        console.log("Connected");
        getInfo();
    })
async function getInfo() {
    amqp.connect(process.env.AMQP_URL, function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel((error1, channel) => {
            if (error1) throw error1;

            let queue = "info-queue"
            let exhange = "fddw-endpoint"

            channel.assertQueue(queue, { durable: true })
            channel.bindQueue(queue, exhange, "*.info")

            channel.consume(queue, (msg) => {
                var msgJSON = JSON.parse(msg.content)
                let id = msgJSON.id
                let chatID = msgJSON.adress

                dbo.collection("travels").findOne({ id: id }, (err, res) => {
                    if (err) throw err;
                    var foramtedMsg = ""

                    if (res != null) {
                        foramtedMsg = `Trip to ${res.destination} from the ${res.startDate} to ${res.endDate}.\n
                        Weather forecast:\n ${weatherFormatter(res)} \n
                        Traffic: \n ${carCounter(res)} \n
                        Possible Topic for this Group: \n all \n weather \n ${topicLister(res)}
                        Have a nice trip!🛬
                        `
                        channel.sendToQueue(msg.properties.replyTo, Buffer.from(foramtedMsg))
                    }
                    else {
                        foramtedMsg = "Seems like this group doesn't exsist..🤔"
                        channel.sendToQueue(msg.properties.replyTo, Buffer.from(foramtedMsg))
                    }
                    channel.ack(msg)
                })
            }, {
                noAck: false
            })
        })
    })
}
