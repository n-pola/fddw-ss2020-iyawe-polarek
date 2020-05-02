var doetenv = require("dotenv").config();
var amqp = require("amqplib/callback_api");

amqp.connect(process.env.AMQP_URL, (error0, conntection) => {
  if (error0) {
    console.error(error0.message);
  }
  conntection.createChannel((error1, channel) => {
    if (error1) {
      console.error(error1.message);
    }

    var queue = "register_queue";
    var message = {
      start_date: "2020.05.01",
      end_date: "2020.05.04",
      destination: "Cologne"
    };

    channel.assertQueue(
      "",
      {
        exclusive: true
      },
      function (error2, q) {
        if (error2) throw error2;

        var msg = JSON.stringify(message);

        channel.consume(
          q.queue,
          function (msg) {
            console.log(msg.content.toString());
            channel.ack(msg);
            channel.deleteQueue(q.queue);
            channel.close();
          },
          {
            noAck: false
          }
        );

        channel.publish("fddw-endpoint", "group.create", Buffer.from(msg), {
          replyTo: q.queue
        });
      }
    );
  });
});
