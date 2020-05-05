require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
var dbo;

MongoClient.connect(
  process.env.MONGO_BASE,
  { useUnifiedTopology: true },
  (error, db) => {
    if (error) console.error(error);
    dbo = db.db("combineData");
    console.log("Connected");
    combine();
  }
);


function combine() {
  amqp.connect(process.env.AMQP_URL, function (error0, con) {
    if (error0) throw error0;

    con.createChannel(function (error1, channel) {
      if (error1) throw error1;

      let exchange_in = "combine_select";
      let exchange_reg = "registration_exchange"
      let queue_in = "combine-queue";
      let queue_reg = "combine-register"
      let exchange_out = "message-exchange"

      channel.assertExchange(exchange_out, "topic", { durable: true });

      channel.assertExchange(exchange_in, "topic", { durable: true });

      channel.assertExchange(exchange_reg, "fanout", { durable: true });

      channel.assertQueue(queue_in, {
        durable: true
      });

      channel.assertQueue(queue_reg, {
        durable: true
      });

      channel.bindQueue(queue_reg, exchange_reg, "*.register")

      channel.bindQueue(queue_in, exchange_in, "*.weather.*");
      channel.bindQueue(queue_in, exchange_in, "*.traffic.*");
      channel.prefetch(1);

      channel.consume(
        queue_in,
        function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey.split(".")
          let { id, type } = { id: key[0], type: key[1] }
          id = parseInt(id)

          if (type == "weather") {
            dbo.collection("travels")
              .findOne({ id: id }, (err, res) => {
                if (res != null) {
                  res.weather = msgJSON

                  channel.publish(exchange_out, msg.fields.routingKey, Buffer.from(msg.content))
                  channel.publish(exchange_out, id + ".all", Buffer.from(msg.content))
                  dbo.collection("travels").replaceOne({ _id: res._id }, { $set: res }, (err, resp) => {
                    if (err) throw err;
                  })

                }
              })

          } else if (type == "traffic") {
            dbo.collection("travels")
              .findOne({ id: id }, (err, res) => {
                if (res != null) {
                  var find = res.traffic.find(elem => elem.carID == key[2])
                  if (find != undefined) {
                    find.duration = msgJSON.newDuration

                    channel.publish(exchange_out, msg.fields.routingKey, Buffer.from(msg.content))
                    channel.publish(exchange_out, id + ".all", Buffer.from(msg.content))

                    dbo.collection("travels").replaceOne({ _id: res._id }, { $set: res }, (err, resp) => {
                      if (err) throw err;
                    })
                  } else {
                    var newCar = {
                      carID: key[2],
                      duration: msgJSON.newDuration
                    }

                    channel.publish(exchange_out, msg.fields.routingKey, Buffer.from(msg.content))
                    channel.publish(exchange_out, id + ".all", Buffer.from(msg.content))

                    dbo
                      .collection("travels")
                      .updateOne(
                        { _id: res._id },
                        { $push: { traffic: newCar } }, (err, res) => {

                        })
                  }
                }
              })
          }


          channel.ack(msg);
        },
        { noAck: false }
      );

      channel.consume(queue_reg, (msg) => {
        let msgJSON = JSON.parse(msg.content.toString());

        let db_obj = {
          id: msgJSON.id,
          destination: msgJSON.destination,
          startDate: msgJSON.startDate,
          endDate: msgJSON.endDate,
          traffic: [],
          weather: {}
        }

        dbo
          .collection("travels")
          .insertOne(db_obj, function (err, res) { });

        channel.ack(msg);
      }, {
        noAck: false
      })
    });

  });
}