require("dotenv").config();
const amqp = require("amqplib/callback_api");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;
var dbo;

MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbo = db.db("weather");
  console.log("connected");
  startShedule();
});

function startShedule() {
  var minutes = 10;
  var the_interval = minutes * 60 * 1000;
  setInterval(checkWeather, the_interval);
}

function checkWeather() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }

    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }

      let exchange = "fddw";
      let topic = "weather.update";

      dbo
        .collection("entries")
        .find({})
        .toArray(function (err, result) {
          result.forEach((elem) => {
            let msg = { id: elem.id, destination: elem.destination };
            console.log(msg);
            msg = JSON.stringify(msg);
            channel.publish(exchange, topic, Buffer.from(msg));
          });
        });
    });
  });
}
