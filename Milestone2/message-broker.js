require("dotenv").config();
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

function sender() {
  amqp.connect(process.env.AMQP_URL, function (error0, connection) {
    if (error0) {
      throw error0;
    }

    connection.createChannel((error, channel) => {
      if (error) throw error;

      var exchange_in = "message-exchange";
      var queue = "message-broker-queue";

      channel.assertExchange(exchange_in, "topic", { durable: true });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.bindQueue(queue, exchange_in, "all");
      channel.bindQueue(queue, exchange_in, "*.weather.*");
      channel.bindQueue(queue, exchange_in, "*.traffic.*");

      channel.consume(
        queue,
        (msg) => {
          let msgJSON = JSON.parse(msg.content.toString());
          let key = msg.fields.routingKey.split(".");
          let id = key[0];
          let type = key[1];
          let subType = key[2];
          var outMsg;

          if (type == "traffic") {
            if (msgJSON.newDuration > msgJSON.oldDuration) {
              let diff = sToTime(msgJSON.newDuration - msgJSON.oldDuration);
              outMsg = `🚗 The new duration for car ${subType} is ${sToTime(
                msgJSON.newDuration
              )}, that is ${diff} slower than you old time}`;
            } else {
              let diff = sToTime(msgJSON.oldDuration - msgJSON.newDuration);
              outMsg = `🚗 The new duration for car ${subType} is ${sToTime(
                msgJSON.newDuration
              )}, that is ${diff} faster than you old time`;
            }
          } else if (type == "weather") {
            outMsg = "New Forecast! 🌤 \n";
            for (let index = 0; index < msgJSON.forecast.length; index++) {
              const elem = msgJSON.forecast[index];
              let date = new Date(elem.utcTime);
              date = date.toDateString();
              outMsg += `${date}: ${elem.highTemperature} \n`;
            }
          }
          console.log(id);
          dbo.collection("entries").findOne({ id: id }, (err, res) => {
            if (error) throw err;
            console.log(res);
            if (res != null) {
              res.service.forEach((elem) => {
                let queue = elem.serviceName;
                console.log(queue);
                elem.subscriptions.forEach((element) => {
                  if (
                    element.topics.includes(type) ||
                    element.topics.includes(type + "." + subType) ||
                    element.topics.includes("all")
                  ) {
                    let adress = element.adress;
                    message = { adress: adress, message: outMsg };
                    channel.sendToQueue(
                      queue,
                      Buffer.from(JSON.stringify(message))
                    );
                  }
                });
              });
            }
          });
          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  });
}

function sToTime(duration) {
  (minutes = Math.floor((duration / 60) % 60)),
    (hours = Math.floor((duration / (100 * 60)) % 24));

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return hours + " Stunden und  " + minutes + " Minuten";
}
