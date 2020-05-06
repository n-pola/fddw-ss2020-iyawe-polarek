require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;
var dbo;

MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbo = db.db("traffic");
  console.log("connected to traffic db");
  startReceive();
});

function startReceive() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) throw error0;

    connection.createChannel(function (error1, channel) {
      if (error1) throw error1;

      let exchange_in = "registration_exchange";
      let exchange_add = "fddw-endpoint";
      let topic_add = "*.add";
      let queue_in = "traffic_register";
      let topic_in = "*.register";
      let fetchQueue = "traffic_fetch_jobs";

      channel.prefetch(1);
      channel.assertQueue(queue_in, { durable: true });
      channel.assertQueue(fetchQueue, { durable: true });
      channel.bindQueue(queue_in, exchange_in, topic_in);
      channel.bindQueue(queue_in, exchange_add, topic_add);

      channel.consume(
        queue_in,
        async function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey;
          let id = key.split(".")[0];

          if (key.endsWith(".register")) {
            let dbObj = {
              id: id,
              cars: [],
              destination: msgJSON.destination,
              startDate: msgJSON.startDate
            };
            dbo.collection("entries").insertOne(dbObj, function (err, res) {});
            channel.ack(msg);
          } else if (key.endsWith(".add")) {
            dbo
              .collection("entries")
              .findOne({ id: id }, function (err, result) {
                if (result == null) {
                  channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(`No Group with ID ${id}`)
                  );
                  channel.ack(msg);
                } else {
                  let carID = result.cars.length + 1;
                  let newCar = {
                    carID: carID,
                    type: msgJSON.type,
                    start: msgJSON.start,
                    passengers: msgJSON.passengers,
                    data: {}
                  };
                  console.log(newCar);

                  dbo
                    .collection("entries")
                    .updateOne(
                      { _id: result._id },
                      { $push: { cars: newCar } },
                      function (err, res) {
                        if (err) throw err;
                        let fetch = { id: id };
                        channel.sendToQueue(
                          fetchQueue,
                          Buffer.from(JSON.stringify(fetch))
                        );
                        channel.sendToQueue(
                          msg.properties.replyTo,
                          Buffer.from(
                            `Added a new Car to your Group ${id} \n The cars ID is ${carID} \n\n You can subscribe to it with "traffic.${carID}" or "traffic" if you want all cars 🏎`
                          )
                        );
                        channel.ack(msg);
                      }
                    );
                }
              });
          }
        },
        {
          noAck: false
        }
      );
    });
  });
}
