require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Joi = require("joi");
const amqp = require("amqplib/callback_api");

const MongoClient = require("mongodb").MongoClient;
var dbo;

MongoClient.connect(
  process.env.MONGO_BASE,
  { useUnifiedTopology: true },
  (error, db) => {
    if (error) console.error(error);
    dbo = db.db("subs");
    console.log("Connected");

    sender();
  }
);

var amqpConnection;
function sender() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }

    amqpConnection = connection;
    startBot();
  });
}
function startBot() {
  const token = process.env.TELEGRAM;

  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, { polling: true });

  function validateRegistration(registration) {
    const schema = {
      destination: Joi.string().min(3).max(50).required(),
      start_date: Joi.date(),
      end_date: Joi.date(),
      adress: Joi.number(),
      service: Joi.string()
    };

    return Joi.validate(registration, schema);
  }

  bot.on("polling_error", (err) => console.log(err));

  // Matches "/echo [whatever]"
  bot.onText(/\/register (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    match = match[1].split(" ");
    const registration = {
      destination: match[0],
      start_date: match[1],
      end_date: match[2],
      adress: chatId,
      service: "telegram"
    };

    const { error } = validateRegistration(registration);

    if (error) bot.sendMessage(chatId, error.details[0].message);
    else {
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
                bot.sendMessage(chatId, msg.content.toString());
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
    }
  });

  // Matches "/echo [whatever]"
  bot.onText(/\/add (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    match = match[1].split(" ");
    var passengers = [];
    for (let index = 3; index < match.length; index++) {
      passengers.push(match[index]);
    }
    let id = match[0];
    const car = {
      type: match[1],
      start: match[2],
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
              bot.sendMessage(chatId, msg.content.toString());
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
  });

  bot.onText(/\/sub (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    match = match[1].split(" ");
    var topics = [];
    for (let index = 1; index < match.length; index++) {
      topics.push(match[index]);
    }
    let id = match[0];
    const msgObj = {
      service: "telegram",
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
              bot.sendMessage(chatId, msg.content.toString());
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
  });

  amqpConnection.createChannel(function (error1, channel) {
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
        let key = msg.fields.routingKey;
        let id = key.split(".")[0];
        let msgJSON = JSON.parse(msg.content.toString());
        dbo
          .collection("entries")
          .findOne({ id: id }, async function (err, result) {
            let findService = result.service.find(
              (element) => element.serviceName == "telegram"
            );
            if (findService != undefined) {
              findService.subscriptions.forEach((element) => {
                bot.sendMessage(element.adress, msg.content.toString());
              });
            }
          });
        console.log(msgJSON);
        console.log(msg.fields.routingKey);
        channel.ack(msg);
      },
      { noAck: false }
    );
  });

  bot.onText(/\/info (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    match = match[1].split(" ");
    let id = match[0];
    var idtoInt = parseInt(id)
    console.log(`match : ${id}`)

    amqpConnection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      let exchange = "fddw-endpoint";

      channel.assertExchange(exchange, "topic", {
        durable: false
      });
      var msgObj = {
        service: "telegram",
        adress: chatId,
        id: idtoInt
      }
      channel.prefetch(1);

      channel.assertQueue(
        "",
        {
          exclusive: true
        }, function (error2, q) {
          if (error2) throw error2;

          var msg = JSON.stringify(msgObj);

          channel.consume(
            q.queue,
            function (msg) {
              bot.sendMessage(chatId, msg.content.toString());
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
          })
        })
    })
  })
}
