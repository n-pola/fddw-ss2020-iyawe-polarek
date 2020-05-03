require("dotenv").config();
const amqp = require("amqplib/callback_api");

amqp.connect(process.env.AMQP_URL, function (error0, con) {
  if (error0) throw error0;

  con.createChannel(function (error1, channel) {
    if (error1) throw error1;

    let exchange = "combine_select";
    let queue = "combine-reader";

    channel.assertExchange(exchange, "topic", { durable: true });

    channel.assertQueue(queue, {
      exclusive: true
    });

    channel.bindQueue(queue, exchange, "*.weather.*");
    channel.bindQueue(queue, exchange, "*.traffic.*");
    channel.prefetch(1);

    channel.consume(
      queue,
      function (msg) {
        let msgJSON = JSON.parse(msg.content.toString());
        console.log(msgJSON);
        console.log(msg.fields.routingKey);
        channel.ack(msg);
      },
      { noAck: false }
    );
  });
});
