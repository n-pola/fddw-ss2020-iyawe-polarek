var amqp = require("amqplib/callback_api");
var fs = require("fs");

function newEntrie(id) {
  let entries = fs.readFileSync("./data/combine.json", "utf8");
  entries = JSON.parse(entries);
  entries.push({ id: id, weather: [], traffic: [] });
  fs.writeFileSync("./data/combine.json", JSON.stringify(entries));
}

amqp.connect(
  "",
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
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.bindQueue(queue, exchange, "combine.weather");
      channel.bindQueue(queue, exchange, "combine.traffic");
      channel.bindQueue(queue, exchange, "newSub");

      channel.prefetch(1);

      channel.consume(
        queue,
        function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey;

          console.log(msgJSON);

          if (key == "newSub") {
            newEntrie(msgJSON.id);
          } else if (key == "combine.traffic") {
            let entries = fs.readFileSync("./data/combine.json", "utf8");
            entries = JSON.parse(entries);
            entries.forEach((element) => {
              if (element.id == msgJSON.id) {
                element.traffic.splice(0, element.traffic.length);
                element.traffic.push(msgJSON.data);

                if (element.weather.length) {
                  channel.publish(
                    "user_notification",
                    msgJSON.id.toString(),
                    Buffer.from(JSON.stringify(element))
                  );
                }
              }
            });
            fs.writeFileSync("./data/combine.json", JSON.stringify(entries));
          } else if (key == "combine.weather") {
            let entries = fs.readFileSync("./data/combine.json", "utf8");
            entries = JSON.parse(entries);
            entries.forEach((element) => {
              if (element.id == msgJSON.id) {
                element.weather.splice(0, element.weather.length);
                element.weather.push(msgJSON.data);

                if (element.traffic.length) {
                  channel.publish(
                    "user_notification",
                    msgJSON.id.toString(),
                    Buffer.from(JSON.stringify(element))
                  );
                }
              }
            });
            fs.writeFileSync("./data/combine.json", JSON.stringify(entries));
          }
          channel.ack(msg);
        },
        { noAck: false }
      );
    });

    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = "combine_select";
      var queue = "select_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });
      channel.bindQueue(queue, exchange, "newUser");

      channel.prefetch(1);

      channel.consume(
        queue,
        function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey;

          console.log(key, msgJSON);

          let entries = fs.readFileSync("./data/combine.json", "utf8");
          entries = JSON.parse(entries);
          entries.forEach((el) => {
            if (el.id == msgJSON.id) {
              channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(JSON.stringify(el))
              );
            }
          });
          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  }
);
