var amqp = require("amqplib/callback_api");
const axios = require("axios");

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/",
});

const weather = axios.create({
  baseURL: "https://weather.ls.hereapi.com/weather/1.0/",
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
          channel.bindQueue(q.queue, exchange, "sub.weather");

          channel.consume(
            q.queue,
            function (msg) {
              console.log(
                " [x] %s:'%s'",
                msg.fields.routingKey,
                msg.content.toString()
              );
              let msgJSON = JSON.parse(msg.content.toString());
              var forecast = getForecast(msgJSON.location);
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

async function getForecast(locationName) {
  var longlang = await getLocation(locationName);
  console.log(longlang.items[0].position);

  var forecast = await weather
    .get(
      "report.json?apikey=MSH7DDlqeAqt2lrAr2MjBl62GR5bDxNrEbO8UiecDBg&product=forecast_7days_simple&latitude=" +
        longlang.items[0].position.lat +
        "&longitude=" +
        longlang.items[0].position.lng +
        ""
    )
    .then(function (response) {
      console.log(response.data.dailyForecasts.forecastLocation);
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
