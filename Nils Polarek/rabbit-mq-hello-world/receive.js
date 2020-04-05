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

      var queue = "task_queue";

      channel.assertQueue(queue, {
        durable: true,
      });

      console.log(
        " [*] Waiting for messages in %s. To exit press CTRL+C",
        queue
      );

      channel.consume(
        queue,
        function (msg) {
          var secs = msg.content.toString().split(".").length - 1;

          console.log(" [x] Received %s", msg.content.toString());
          setTimeout(function () {
            console.log(" [x] Done");
            channel.ack(msg);
          }, secs * 1000);
        },
        {
          noAck: false,
        }
      );
    });
  }
);
