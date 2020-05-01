require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;

const forecast = require("./lib/weatherFunctions");

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
        console.log(weather);
        channel.ack(msg);
      },
      {
        noAck: false
      }
    );
  });
});
