var amqp = require("amqplib/callback_api");
var fs = require("fs");

const createID = function () {
  let subscriptions = fs.readFileSync("./data/subscriptions.json", "utf8");
  subscriptions = JSON.parse(subscriptions);
  var id = Math.floor(Math.random() * 100000);
  subscriptions.forEach((element) => {
    if (element.id == id) {
      id = createItemID(subscriptions);
    }
  });
  subscriptions.push({ id: id });
  fs.writeFileSync("./data/subscriptions.json", JSON.stringify(subscriptions));
  return id;
};

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
      var queue = "sub_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false,
      });

      channel.assertQueue(queue, {
        durable: true,
      });

      channel.bindQueue(queue, exchange, "sub.req");

      channel.prefetch(1);

      channel.consume(
        queue,
        function (msg) {
          let id = createID();
          var content = msg.content.toString();
          content = JSON.parse(content);
          let weather = { id: id, location: content.destination };
          let traffic = { id: id, ...content };
          console.log({ id: id, content: content });
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

          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  }
);
