require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;
var dbo;

const forecast = require("./lib/weatherFunctions");

MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbo = db.db("weather");
  console.log("connected");
  listenTOQueue();
});

function listenTOQueue() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }

    connection.createChannel(function (error1, channel) {
      if (error1) throw error1;

      let exchange_in = "registration_exchange";
      let queue_in = "weather_register";
      let topic_in = "*.register";
      let fetchQueue = "weather_fetch_jobs";

      channel.assertQueue(queue_in, { durable: true });

      channel.assertQueue(fetchQueue, { durable: true });

      channel.prefetch(1);

      channel.bindQueue(queue_in, exchange_in, topic_in);

      channel.consume(
        queue_in,
        function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let dbObj = {
            id: msgJSON.id,
            data: {},
            destination: msgJSON.destination
          };
          dbo.collection("entries").insertOne(dbObj, function (err, res) {});

          let fetchMessage = {
            id: msgJSON.id,
            destination: msgJSON.destination
          };
          channel.sendToQueue(
            fetchQueue,
            Buffer.from(JSON.stringify(fetchMessage))
          );
          channel.ack(msg);
        },
        {
          noAck: false
        }
      );
    });
  });
}
