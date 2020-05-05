require("dotenv").config();
const amqp = require("amqplib/callback_api");
const sToTime = require("./lib/sToTime")
const weatherFormatter = require("./lib/weatherFormatter")
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


            channel.bindQueue(queue, exhange, "*.info")

            channel.consume(queue, (msg) => {
                var msgJSON = JSON.parse(msg.content)
                console.log(msgJSON)
                let id = msgJSON.id
                console.log(id)
                let chatID = msgJSON.adress
                console.log(chatID)


                dbo.collection("travels").findOne({ id: id }, (err, res) => {
                    if (err) throw err;
                    var msgJSONa = ""
                    if (res != null) {
                        msgJSONa = `Trip to ${res.destination} from the ${res.startDate} to ${res.endDate}.\n
                        Weather forecast:\n ${weatherFormatter(res)} \n
                        Traffic: ${sToTime(res.traffic[0].duration)}. \n
                        Possible Topic for this Group: \n all, weather, traffic, traffic.1, traffic.2.
                        Have a nice trip!🛬
                        `
                        channel.sendToQueue(msg.properties.replyTo, Buffer.from(msgJSONa))

                    }
                    else {
                        msgJSONa = "Seems like this group doesn't exsist..🤔"
                        channel.sendToQueue(msg.properties.replyTo, Buffer.from(msgJSONa))
                    }

                })
                channel.ack(msg)

            }, {
                noAck: false
            })



            //channel.sendToQueue(queue, Buffer.from(msgJSONa), { replyTo: q.queue })

        })

        /**
         *  var msgJSONa = `Trip to ${res.destination} from the ${res.startDate} to ${res.endDate}.\n
                   Weather forecast: ${weatherFormatter(res)} \n
                   Traffic: ${sToTime(res.traffic[0].duration)}. \n
                   Possible Topic for this Group: \t all, weather, traffic, traffic.1, traffic.2.
                   Have a nice trip!
                   `
         *  */
        // channel.sendToQueue(queue, Buffer.from(msgJSON), { replyTo: q.queue })
    })
}
