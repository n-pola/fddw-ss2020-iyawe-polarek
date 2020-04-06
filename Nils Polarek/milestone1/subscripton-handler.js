var amqp = require("amqplib/callback_api");

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
      var exchange = "subscription";
      var queue = "rpc_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false,
      });

      channel.assertQueue(
        "",
        {
          exclusive: true,
        },
        function (error2, q) {
          if (error2) throw error2;

          channel.bindQueue(q.queue, exchange, "sub.req");
          channel.prefetch(1);

          channel.consume(
            q.queue,
            function (msg) {
              let id = 1;
              var content = msg.content.toString();
              content = JSON.parse(content);
              let weather = { id: id, location: content.destination };
              let traffic = { id: id, ...content };
              console.log(weather);
              channel.publish(
                "subscription",
                "sub.weather",
                Buffer.from(JSON.stringify(weather))
              );
              channel.publish(
                "subscription",
                "sub.traffic",
                Buffer.from(JSON.stringify(traffic))
              );
              channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(id.toString()),
                {
                  correlationId: msg.properties.correlationId,
                }
              );

              //channel.ack(msg);
            },
            { noAck: true }
          );
        }
      );
    });
  }
);
