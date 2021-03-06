const amqp = require("amqplib/callback_api");
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
var db_id;

MongoClient.connect(
  process.env.MONGO_BASE,
  { useUnifiedTopology: true },
  (error, db) => {
    if (error) console.error(error);
    db_id = db.db("travel_ids");
    console.log("Connected");

    registrationHandler();
  }
);
async function registrationHandler() {
  amqp.connect(process.env.AMQP_URL, (error0, connection) => {
    if (error0) {
      console.error(error0.message);
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        console.error(error1.message);
      }

      console.log("Connection stable");

      var queue = "register_queue";
      //created an exchange between Registration Handler and the (traffic, weather) queues stop direct routing between the registration handler.
      var exchange_in = "fddw-endpoint";
      var exchange_out = "registration_exchange";

      channel.assertExchange(exchange_in, "topic", {
        durable: false
      });

      channel.assertExchange(exchange_out, "fanout", {
        durable: true
      });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.bindQueue(queue, exchange_in, "group.create");

      channel.prefetch(1);

      channel.consume(
        queue,
        (message) => {
          if (message.content) {
            console.log(" [x] %s", message.content.toString());
            var travel_id = generateUuid();
            let msgJSON = JSON.parse(message.content.toString());
            var msg = {
              id: travel_id,
              destination: msgJSON.destination,
              startDate: msgJSON.start_date,
              endDate: msgJSON.end_date
            };

            channel.publish(
              exchange_out,
              `${msg.id}.register`,
              Buffer.from(JSON.stringify(msg))
            );

            let textMsg = `Your travel-group has been created and has the ID ${msg.id}! ✔`;

            channel.sendToQueue(
              message.properties.replyTo,
              Buffer.from(textMsg)
            );

            let topic = travel_id + ".sub";

            let msg2 = {
              service: msgJSON.service,
              adress: msgJSON.adress,
              topics: ["all"]
            };

            channel.publish(
              exchange_in,
              topic,
              Buffer.from(JSON.stringify(msg2))
            );

            console.log(`sent: ${JSON.stringify(msg)} `);
            channel.ack(message);
          }
        },
        {
          noAck: false
        }
      );
    });
  });
}

//creates a five digit random id for the travel Log.
function generateUuid() {
  var id = Math.floor(Math.random() * 90000) + 10000;

  db_id
    .collection("ID_entries")
    .findOne({ number: id }, function (err, result) {
      if (result != null) {
        id = generateUuid();
      } else {
        db_id
          .collection("ID_entries")
          .insertOne({ number: id }, function (err, res) {});
      }
    });

  return id;
}
