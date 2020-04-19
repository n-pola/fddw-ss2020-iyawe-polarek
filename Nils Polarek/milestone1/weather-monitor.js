var amqp = require("amqplib/callback_api");
const axios = require("axios");
var fs = require("fs");

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/"
});

const weather = axios.create({
  baseURL: "https://weather.ls.hereapi.com/weather/1.0/"
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
          durable: false
        });

        channel.assertQueue(queue, {
          durable: true
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
            var forecast = await getForecast(msgJSON.destination, msgJSON.id);
            console.log(forecast);
            channel.publish(
              "combine_select",
              "combine.weather",
              Buffer.from(JSON.stringify(forecast))
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
}

function reduceWeatherData(weather) {
  var newWeather = {};
  var reducedForecasts = [];
  weather.dailyForecasts.forecastLocation.forecast.forEach((el) => {
    let forecast = {
      highTemperature: el.highTemperature,
      lowTemperature: el.lowTemperature,
      utcTime: el.utcTime
    };
    reducedForecasts.push(forecast);
  });
  newWeather.country = weather.dailyForecasts.forecastLocation.country;
  newWeather.state = weather.dailyForecasts.forecastLocation.state;
  newWeather.city = weather.dailyForecasts.forecastLocation.city;
  newWeather.forecast = reducedForecasts;
  return newWeather;
}

async function getForecast(destination, id) {
  return new Promise(async function (resolve, reject) {
    try {
      var forecast = await weather
        .get(
          "report.json?apikey=MSH7DDlqeAqt2lrAr2MjBl62GR5bDxNrEbO8UiecDBg&product=forecast_7days_simple&latitude=" +
            destination.lat +
            "&longitude=" +
            destination.lng +
            ""
        )
        .then(function (response) {
          let weatherEntries = fs.readFileSync("./data/weather.json", "utf8");
          weatherEntries = JSON.parse(weatherEntries);
          let data = reduceWeatherData(response.data);
          weatherEntries.push({ id: id, data: data });
          fs.writeFileSync(
            "./data/weather.json",
            JSON.stringify(weatherEntries)
          );
          resolve({ id: id, data: data });
        })
        .catch(function (error) {
          console.log(error);
          reject(error);
        });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}
