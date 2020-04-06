var amqp = require("amqplib/callback_api");
const axios = require("axios");

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/",
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
              var destination = getLocation(msgJSON.destination);
              console.log(destination);
              var start = getLocation(msgJSON.start);
              console.log(start);
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

async function getLocation(locationName) {
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
