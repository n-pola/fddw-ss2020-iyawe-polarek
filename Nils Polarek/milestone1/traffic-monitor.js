var amqp = require("amqplib/callback_api");
const axios = require("axios");
var fs = require("fs");

const route = axios.create({
  baseURL: "https://router.hereapi.com/v8/"
});

amqp.connect(
  "",
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

      var minutes = 10;
      var the_interval = minutes * 60 * 1000;
      setInterval(checkTraffic, the_interval);
      async function checkTraffic() {
        let traffic = fs.readFileSync("./data/traffic.json", "utf8");
        traffic = JSON.parse(traffic);

        for (i = 0; i < traffic.length; i++) {
          let element = traffic[i];
          let id = element.id;
          let section = element.data.routes[0].sections[0];
          console.log(section);
          let destination = {
            lat: section.arrival.place.originalLocation.lat,
            lng: section.arrival.place.originalLocation.lng
          };
          let start = {
            lat: section.departure.place.originalLocation.lat,
            lng: section.departure.place.originalLocation.lng
          };
          var newTraffic = await getRouteInterval(id, start, destination);

          console.log(newTraffic);

          if (!(JSON.stringify(element) === JSON.stringify(newTraffic))) {
            traffic[i] = newTraffic;
            console.log("update for" + element.id);
            channel.publish(
              "combine_select",
              "combine.traffic",
              Buffer.from(JSON.stringify(newTraffic))
            );
          }
        }
        fs.writeFileSync("./data/traffic.json", JSON.stringify(traffic));
      }
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
            "&return=summary&apikey="
        )
        .then(function (response) {
          let trafficEntries = fs.readFileSync("./data/traffic.json", "utf8");
          trafficEntries = JSON.parse(trafficEntries);
          trafficEntries.push({ id: id, data: response.data });
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

async function getRouteInterval(id, start, destination) {
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
            "&return=summary&apikey="
        )
        .then(function (response) {
          resolve({ id: id, data: response.data });
        })
        .catch(function (error) {
          console.log(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}
