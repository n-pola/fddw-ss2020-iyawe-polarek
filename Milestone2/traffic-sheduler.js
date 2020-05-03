require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;
var dbo;

MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbo = db.db("traffic");
  console.log("connected");
  startShedule();
});

function startShedule() {
  var minutes = 10;
  var the_interval = minutes * 60 * 1000;
  setInterval(checkTraffic, the_interval);
}

function checkTraffic() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }

    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }

      let queue = "traffic_fetch_jobs";

      channel.assertQueue(queue, {
        durable: true
      });

      dbo
        .collection("entries")
        .find({})
        .toArray(function (err, result) {
          result.forEach((elem) => {
            let msg = { id: elem.id };
            console.log(msg);
            msg = JSON.stringify(msg);
            channel.sendToQueue(queue, Buffer.from(msg));
          });
        });
    });
  });
}
