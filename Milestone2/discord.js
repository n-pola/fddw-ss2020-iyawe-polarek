const Discord = require("discord.js");
const client = new Discord.Client();
const amqp = require("amqplib/callback_api");
require("dotenv").config();

client.login(process.env.DISCORD);

client.once("ready", () => {
  console.log("Ready!");
  connectAMQP();
});
var aqmpConnection;
function connectAMQP() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }
    console.log("Connected to CloudAmqp");
    amqpConnection = connection;
    startBot();
  });
}

function startBot() {
  client.on("message", (message) => {
    if (!message.author.bot && message.channel.type == "dm") {
      var msg = message.content.split(" ");
      if (msg[0] == "/register") {
        const chatId = message.author.id;
        console.log(chatId);
        const registration = {
          destination: msg[1],
          start_date: msg[2],
          end_date: msg[3],
          adress: chatId,
          service: "discord"
        };
        amqpConnection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }

          let exchange = "fddw-endpoint";

          channel.assertExchange(exchange, "topic", {
            durable: false
          });
          channel.prefetch(1);

          channel.assertQueue(
            "",
            {
              exclusive: true
            },
            function (error2, q) {
              if (error2) throw error2;

              var msg = JSON.stringify(registration);

              channel.consume(
                q.queue,
                function (msg) {
                  message.author.send(msg.content.toString());
                  channel.ack(msg);
                  channel.deleteQueue(q.queue);
                  channel.close();
                },
                {
                  noAck: false
                }
              );

              channel.publish(
                "fddw-endpoint",
                "group.create",
                Buffer.from(msg),
                {
                  replyTo: q.queue
                }
              );
            }
          );
        });
      } else if (msg[0] == "/add") {
        const chatId = message.author.id;
        console.log(chatId);
        var passengers = [];
        for (let index = 4; index < msg.length; index++) {
          passengers.push(msg[index]);
        }
        let id = msg[1];
        const car = {
          type: msg[2],
          start: msg[3],
          passengers: passengers
        };

        amqpConnection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }

          let exchange = "fddw-endpoint";

          channel.assertExchange(exchange, "topic", {
            durable: false
          });
          channel.prefetch(1);

          channel.assertQueue(
            "",
            {
              exclusive: true
            },
            function (error2, q) {
              if (error2) throw error2;

              var msg = JSON.stringify(car);

              channel.consume(
                q.queue,
                function (msg) {
                  message.author.send(msg.content.toString());
                  channel.ack(msg);
                  channel.deleteQueue(q.queue);
                  channel.close();
                },
                {
                  noAck: false
                }
              );

              channel.publish("fddw-endpoint", id + ".add", Buffer.from(msg), {
                replyTo: q.queue
              });
            }
          );
        });
      } else if (msg[0] == "/sub") {
        const chatId = message.author.id;
        console.log(chatId);
        var topics = [];
        for (let index = 2; index < msg.length; index++) {
          topics.push(msg[index]);
        }
        let id = msg[1];
        const msgObj = {
          service: "discord",
          adress: chatId,
          topics: topics
        };

        amqpConnection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }

          let exchange = "fddw-endpoint";

          channel.assertExchange(exchange, "topic", {
            durable: false
          });
          channel.prefetch(1);

          channel.assertQueue(
            "",
            {
              exclusive: true
            },
            function (error2, q) {
              if (error2) throw error2;

              var msg = JSON.stringify(msgObj);

              channel.consume(
                q.queue,
                function (msg) {
                  message.author.send(msg.content.toString());
                  channel.ack(msg);
                  channel.deleteQueue(q.queue);
                  channel.close();
                },
                {
                  noAck: false
                }
              );

              channel.publish("fddw-endpoint", id + ".sub", Buffer.from(msg), {
                replyTo: q.queue
              });
            }
          );
        });
      } else if (msg[0] == "/info") {
        const chatId = message.author.id;
        console.log(chatId);
        let id = msg[1];
        var idtoInt = parseInt(id);
        console.log(`match : ${id}`);

        amqpConnection.createChannel((error1, channel) => {
          if (error1) {
            throw error1;
          }

          let exchange = "fddw-endpoint";

          channel.assertExchange(exchange, "topic", {
            durable: false
          });
          var msgObj = {
            service: "discord",
            adress: chatId,
            id: idtoInt
          };
          channel.prefetch(1);

          channel.assertQueue(
            "",
            {
              exclusive: true
            },
            function (error2, q) {
              if (error2) throw error2;

              var msg = JSON.stringify(msgObj);

              channel.consume(
                q.queue,
                function (msg) {
                  message.author.send(msg.content.toString());
                  channel.ack(msg);
                  channel.deleteQueue(q.queue);
                  channel.close();
                },
                {
                  noAck: false
                }
              );

              channel.publish("fddw-endpoint", id + ".info", Buffer.from(msg), {
                replyTo: q.queue
              });
            }
          );
        });
      }
    } else if (!message.author.bot) {
      message.channel.send("Bitte nur als Direkt Nachricht!");
    }
  });

  amqpConnection.createChannel(function (error1, channel) {
    if (error1) throw error1;

    let queue = "discord";

    channel.assertQueue(queue, {
      durable: true
    });

    channel.prefetch(1);

    channel.consume(
      queue,
      function (msg) {
        let msgJSON = JSON.parse(msg.content.toString());
        client.users.fetch(msgJSON.adress).then((user) => {
          user.send(msgJSON.message);
        });
        console.log(msgJSON);
        channel.ack(msg);
      },
      { noAck: false }
    );
  });
}
