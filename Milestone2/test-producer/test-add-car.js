require("dotenv").config();
const amqp = require("amqplib/callback_api");
var args = process.argv.slice(2);

amqp.connect(process.env.AMQP_URL, function (error0, con) {
  if (error0) throw error0;

  con.createChannel(function (error1, channel) {
    if (error1) throw error1;

    let exchange_out = "fddw-endpoint";
    let id = args[0];
    let topic = id + ".add";

    let msg = {
      type: "car",
      start: "Amsterdam",
      passengers: ["Nils", "Geroge", "Luca"]
    };

    channel.assertQueue("", { exclusive: true }, function (e2, q) {
      if (e2) throw e2;

      channel.consume(
        q.queue,
        function (msg) {
          console.log(msg.content.toString());
          channel.ack(msg);
          con.close();
        },
        {
          noAck: false
        }
      );

      channel.publish(exchange_out, topic, Buffer.from(JSON.stringify(msg)), {
        replyTo: q.queue
      });
    });
  });
});
