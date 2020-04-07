var amqp = require("amqplib/callback_api");
const axios = require("axios");

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/",
});

const route = axios.create({
  baseURL: "https://router.hereapi.com/v8/",
});

amqp.connect(
  "amqp://dtnuecqi:gGpHnyj_8HKgJC_w2okKeZZJmXxkEnsn@bee.rmq.cloudamqp.com/dtnuecqi",
  function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = "subscription";

      channel.assertExchange(exchange, "topic", {
        durable: false,
      });

      channel.assertQueue(
        "",
        {
          exclusive: true,
        },
        function (error2, q) {
          if (error2) {
            throw error2;
          }
          console.log(" [*] Waiting for logs. To exit press CTRL+C");
          channel.prefetch(1);
          channel.bindQueue(q.queue, exchange, "sub.traffic");

          channel.consume(
            q.queue,
            function (msg) {
              console.log(
                " [x] %s:'%s'",
                msg.fields.routingKey,
                msg.content.toString()
              );
              let msgJSON = JSON.parse(msg.content.toString());
              getRoute(msgJSON);
            },
            {
              noAck: true,
            }
          );
        }
      );
    });
  }
);

function getLocation(locationName) {
  return new Promise(async function (resolve, reject) {
    try {
      locationName = locationName.replace(" ", "+");
      locationName = locationName.replace(",", "%2C");

      here
        .get(
          "/geocode?q=" +
            locationName +
            "&apikey=MSH7DDlqeAqt2lrAr2MjBl62GR5bDxNrEbO8UiecDBg"
        )
        .then(function (response) {
          console.log(response.data);
          resolve(response.data);
        })
        .catch(function (error) {
          // handle error
          console.log(error);
        })
        .then(function () {
          // always executed
        });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

async function getRoute({ destination, start }) {
  var start = await getLocation(start);
  var destination = await getLocation(destination);

  console.log(start);
  console.log(destination);

  route
    .get(
      "routes?transportMode=car&origin=" +
        start.items[0].position.lat +
        "," +
        start.items[0].position.lng +
        "&destination=" +
        destination.items[0].position.lat +
        "," +
        destination.items[0].position.lng +
        "&apikey=MSH7DDlqeAqt2lrAr2MjBl62GR5bDxNrEbO8UiecDBg"
    )
    .then(function (response) {
      console.log(response.data);
      return response.data;
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}
