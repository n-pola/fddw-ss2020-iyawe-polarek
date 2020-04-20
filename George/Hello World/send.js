const amqp = require("amqplib/callback_api");

amqp.connect(
  "amqp://fbrlocve:Gx1Xw4JnnDyGo-ZfYLhDymDM9_tZWAtL@kangaroo.rmq.cloudamqp.com/fbrlocve",
  function(error0, connection) {
    if (error0) {
      throw error0;
    } else {
      console.log("Server started");
    }
    connection.createChannel(function(error1, channel) {
      var queue = "hello";
      var message = "The gram pacer test";

      channel.assertQueue(queue, {
        durable: false
      });

      channel.sendToQueue(queue, Buffer.from(message));
      console.log(" [x] Sent %s", message)
    });

    setTimeout(function(){
      connection.close()
      process.exit(0)
    },500)
  
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue)

    channel.consume(queue, function(message) {
      console.log(" [x] Received %s", msg.content.toString());
    }, {
        noAck: true
      });
  }
);
