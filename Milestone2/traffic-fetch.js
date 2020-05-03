require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;

const traffic = require("./lib/trafficFunctions");

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

      let queue_in = "traffic_fetch_jobs";
      let exchange_out = "combine_select";

      channel.assertExchange(exchange_out, "topic", { durable: true });
      channel.assertQueue(queue_in, { durable: true });

      channel.prefetch(1);

      channel.consume(
        queue_in,
        async function (msg) {
          let msgJSON = JSON.parse(msg.content.toString());
          var resp = await traffic.check(dbo, channel, msgJSON.id);
          console.log(resp);
          channel.ack(msg);
        },
        {
          noAck: false
        }
      );
    });
  });
}
