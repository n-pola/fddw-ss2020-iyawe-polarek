var amqp = require("amqplib/callback_api");
const subs = require("./custom_modules/manageSubs.js");

amqp.connect(
  "",
  async function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(async function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = "subscription";
      var queue = "sub_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.bindQueue(queue, exchange, "sub.req");

      channel.prefetch(1);

      channel.consume(
        queue,
        async function (msg) {
          var content = msg.content.toString();
          content = JSON.parse(content);
          let subObj = await subs.createID(content);
          console.log(subObj);
          if (subObj.type == "new") {
            channel.publish(
              "subscription",
              "sub.weather",
              Buffer.from(JSON.stringify(subObj))
            );
            channel.publish(
              "subscription",
              "sub.traffic",
              Buffer.from(JSON.stringify(subObj))
            );
            channel.publish(
              "combine_select",
              "newSub",
              Buffer.from(JSON.stringify(subObj))
            );
          } else {
            console.log(msg.properties.replyTo);
            channel.publish(
              "combine_select",
              "newUser",
              Buffer.from(JSON.stringify(subObj)),
              {
                replyTo: msg.properties.replyTo.toString()
              }
            );
          }

          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(subObj.id.toString()),
            {
              correlationId: msg.properties.correlationId
            }
          );

          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  }
);
