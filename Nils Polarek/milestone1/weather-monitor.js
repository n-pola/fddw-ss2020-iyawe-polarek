var amqp = require("amqplib/callback_api");
const axios = require("axios");
var fs = require("fs");

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/",
});

const weather = axios.create({
  baseURL: "https://weather.ls.hereapi.com/weather/1.0/",
});

weatherMonitor();

async function weatherMonitor() {
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
        var queue = "weather_sub_queue";

        channel.assertExchange(exchange, "topic", {
          durable: false,
        });

        channel.assertQueue(queue, {
          durable: true,
        });

        channel.bindQueue(queue, exchange, "sub.weather");

        channel.prefetch(1);

        channel.consume(
          queue,
          async function (msg) {
            console.log(
              " [x] %s:'%s'",
              msg.fields.routingKey,
              msg.content.toString()
            );
            let msgJSON = JSON.parse(msg.content.toString());
            var forecast = await getForecast(msgJSON.location, msgJSON.id);
            console.log(forecast);
            channel.publish(
              "combine_select",
              "combine.weather",
              Buffer.from(JSON.stringify(forecast))
            );
            channel.ack(msg);
          },
          {
            noAck: false,
          }
        );
      });
    }
  );
}

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

async function getForecast(locationName, id) {
  return new Promise(async function (resolve, reject) {
    try {
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
          let weatherEntries = fs.readFileSync("./data/weather.json", "utf8");
          weatherEntries = JSON.parse(weatherEntries);
          weatherEntries.push({ id: id, forecast: response.data });
          fs.writeFileSync(
            "./data/weather.json",
            JSON.stringify(weatherEntries)
          );
          resolve({ id: id, forecast: response.data });
        })
        .catch(function (error) {
          // handle error
          console.log(error);
          reject(error);
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
