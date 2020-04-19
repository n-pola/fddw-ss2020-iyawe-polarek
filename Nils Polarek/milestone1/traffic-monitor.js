var amqp = require("amqplib/callback_api");
const axios = require("axios");
var fs = require("fs");

const route = axios.create({
  baseURL: "https://router.hereapi.com/v8/"
});

amqp.connect(
  "amqp://dtnuecqi:gGpHnyj_8HKgJC_w2okKeZZJmXxkEnsn@bee.rmq.cloudamqp.com/dtnuecqi",
  async function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = "subscription";
      var queue = "traffic_sub_queue";

      channel.assertExchange(exchange, "topic", {
        durable: false
      });

      channel.assertQueue(queue, {
        durable: true
      });

      channel.prefetch(1);

      channel.bindQueue(queue, exchange, "sub.traffic");

      channel.consume(
        queue,
        async function (msg) {
          console.log(
            " [x] %s:'%s'",
            msg.fields.routingKey,
            msg.content.toString()
          );
          let msgJSON = JSON.parse(msg.content.toString());
          var route = await getRoute(msgJSON);
          console.log(route);
          channel.publish(
            "combine_select",
            "combine.traffic",
            Buffer.from(JSON.stringify({ id: msgJSON.id, data: route }))
          );
          channel.ack(msg);
        },
        {
          noAck: false
        }
      );
    });
  }
);

async function getRoute({ type, id, start, destination }) {
  return new Promise(async function (resolve, reject) {
    try {
      route
        .get(
          "routes?transportMode=car&origin=" +
            start.lat +
            "," +
            start.lng +
            "&destination=" +
            destination.lat +
            "," +
            destination.lng +
            "&return=summary&apikey=MSH7DDlqeAqt2lrAr2MjBl62GR5bDxNrEbO8UiecDBg"
        )
        .then(function (response) {
          let trafficEntries = fs.readFileSync("./data/traffic.json", "utf8");
          trafficEntries = JSON.parse(trafficEntries);
          trafficEntries.push({ id: id, route: response.data });
          fs.writeFileSync(
            "./data/traffic.json",
            JSON.stringify(trafficEntries)
          );
          resolve(response.data);
        })
        .catch(function (error) {
          console.log(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}
