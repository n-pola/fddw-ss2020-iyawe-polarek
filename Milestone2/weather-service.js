require("dotenv").config();
const amqp = require("amqplib/callback_api");
var mongodb = require("mongodb");
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
      if (error1) {
        throw error1;
      }

      let exchange = "fddw";
      let queue = "weather_queue";
      let topic = "weather.add";

      channel.assertExchange(exchange, "topic", {
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });

      // Nur eine Message gleichzeitig annehmen
      channel.prefetch(1);

      channel.bindQueue(queue, exchange, topic);

      channel.consume(
        queue,
        async function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let weather = await forecast.getForecast(msgJSON.destination);
          let dbInfo = await forecast.updateEntry(
            dbo,
            msgJSON.id,
            weather.data
          );
          let sendTopic = msgJSON.id + ".weather";
          if (dbInfo == "initial") {
            sendTopic = sendTopic + ".initial";
            channel.publish(
              exchange,
              sendTopic,
              Buffer.from(JSON.stringify(weather.data))
            );
          } else if (dbInfo == "update") {
            sendTopic = sendTopic + ".update";
            channel.publish(
              exchange,
              sendTopic,
              Buffer.from(JSON.stringify(weather.data))
            );
          }
          channel.ack(msg);
        },
        {
          noAck: false
        }
      );
    });
  });
}
