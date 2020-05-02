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
      if (error1) {
        throw error1;
      }

      let queue = "weather_fetch_jobs";
      let exchange_out = "combine_select";

      channel.assertExchange(exchange_out, "topic", { durable: true });

      channel.assertQueue(queue, {
        durable: true
      });

      // Nur eine Message gleichzeitig annehmen
      channel.prefetch(1);

      channel.consume(
        queue,
        async function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          console.log(msgJSON);
          let weather = await forecast.getForecast(msgJSON.destination);
          let dbInfo = await forecast.updateEntry(
            dbo,
            msgJSON.id,
            weather.data,
            msgJSON.destination
          );
          console.log(dbInfo);
          let sendTopic = msgJSON.id + ".weather";
          if (dbInfo == "initial") {
            sendTopic = sendTopic + ".initial";
            channel.publish(
              exchange_out,
              sendTopic,
              Buffer.from(JSON.stringify(weather.data))
            );
          } else if (dbInfo == "update") {
            sendTopic = sendTopic + ".update";
            channel.publish(
              exchange_out,
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
