var amqp = require("amqplib/callback_api");
var fs = require("fs");

amqp.connect(
  "amqp://dtnuecqi:gGpHnyj_8HKgJC_w2okKeZZJmXxkEnsn@bee.rmq.cloudamqp.com/dtnuecqi",
  function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = "combine_select";
      var queue = "combine_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false,
      });

      channel.assertQueue(queue, {
        durable: true,
      });

      channel.bindQueue(queue, exchange, "combine.weather");
      channel.bindQueue(queue, exchange, "combine.traffic");

      channel.prefetch(1);

      channel.consume(
        queue,
        function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          channel.publish(
            "user_notification",
            msgJSON.id + ".weather",
            Buffer.from(JSON.stringify(msgJSON))
          );
          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  }
);
