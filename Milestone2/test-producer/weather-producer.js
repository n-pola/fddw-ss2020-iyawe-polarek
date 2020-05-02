require("dotenv").config();
var amqp = require("amqplib/callback_api");

amqp.connect(process.env.AMQP_URL, function (error0, connection) {
  if (error0) {
    throw error0;
  }

  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }

    let exchange = "fddw";
    let topic = "weather.add";
    var msg = { id: 2, destination: "Munich" };
    msg = JSON.stringify(msg);

    channel.publish(exchange, topic, Buffer.from(msg));
  });
});
