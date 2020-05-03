const amqp = require("amqplib/callback_api");
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
var dbo;

MongoClient.connect(
  process.env.MONGO_BASE,
  { useUnifiedTopology: true },
  (error, db) => {
    if (error) console.error(error);
    dbo = db.db("subs");
    console.log("Connected");

    startSub();
  }
);

function startSub() {
  amqp.connect(process.env.AMQP_URL, (error0, con) => {
    if (error0) throw error0;

    con.createChannel((error1, channel) => {
      if (error1) throw error1;

      var queue = "sub_queue";
      var queue_register = "sub_queue_register";
      var exchange_in = "fddw-endpoint";
      let exchange_register = "registration_exchange";

      channel.assertExchange(exchange_register, "fanout", {
        durable: true
      });

      channel.assertExchange(exchange_in, "topic", {
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.assertQueue(queue_register, {
        exclusive: true
      });

      channel.bindQueue(queue, exchange_in, "*.sub");
      channel.bindQueue(queue_register, exchange_register, "*.register");

      channel.prefetch(1);

      channel.consume(
        queue_register,
        (msg) => {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey;
          let id = key.split(".")[0];
          let dbObj = {
            id: id,
            service: []
          };
          dbo.collection("entries").insertOne(dbObj, function (err, res) {});
          channel.ack(msg);
        },
        { noAck: false }
      );

      channel.consume(
        queue,
        (msg) => {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey;
          let id = key.split(".")[0];

          if (key.endsWith(".sub")) {
            let service = msgJSON.service;
            let adress = msgJSON.adress;
            let topics = msgJSON.topics;
            let dbObj = {
              adress: adress,
              topics: topics
            };
            dbo
              .collection("entries")
              .findOne({ id: id }, async function (err, result) {
                if (result == null) {
                  channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(`Group ${id} not found!`)
                  );
                } else {
                  let findService = result.service.find(
                    (element) => element.serviceName == service
                  );
                  if (findService != undefined) {
                    let findAdress = findService.subscriptions.find(
                      (el) => el.adress == adress
                    );
                    console.log(findAdress);
                    if (findAdress != undefined) {
                      findAdress.topics = topics;
                    } else {
                      findService.subscriptions.push({
                        adress: adress,
                        topics: topics
                      });
                    }
                  } else {
                    let newService = {
                      serviceName: service,
                      subscriptions: [{ adress: adress, topics: topics }]
                    };
                    result.service.push(newService);
                  }

                  dbo
                    .collection("entries")
                    .replaceOne(
                      { _id: result._id },
                      { $set: result },
                      function (err, res) {
                        if (err) throw err;
                        channel.sendToQueue(
                          msg.properties.replyTo,
                          Buffer.from(
                            `You Subscribed to Group ${id} with Topics ${topics}`
                          )
                        );
                      }
                    );
                }
              });
            channel.ack(msg);
          }
        },
        { noAck: false }
      );
    });
  });
}
