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
    "",
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
        var minutes = 10;
        var the_interval = minutes * 60 * 1000;
        setInterval(checkWeather, the_interval);
        async function checkWeather() {
          let checkWeatherEntry = fs.readFileSync(
            "./data/weather.json",
            "utf8"
          );
          checkWeatherEntry = JSON.parse(checkWeatherEntry);

          for (i = 0; i < checkWeatherEntry.length; i++) {
            let element = checkWeatherEntry[i];
            let id = element.id;
            let destination = { lat: element.lat, lng: element.lng };
            console.log(id, destination);
            var forecast = await getForecastInterval(destination, id);

            if (!(JSON.stringify(element) === JSON.stringify(forecast))) {
              checkWeatherEntry[i] = forecast;
              console.log("update for" + element.id);
              channel.publish(
                "combine_select",
                "combine.weather",
                Buffer.from(JSON.stringify(forecast))
              );
            }
          }
          fs.writeFileSync(
            "./data/weather.json",
            JSON.stringify(checkWeatherEntry)
          );
        }
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
          "report.json?apikey=&product=forecast_7days_simple&latitude=" +
            destination.lat +
            "&longitude=" +
            destination.lng +
            ""
        )
        .then(function (response) {
          let weatherEntries = fs.readFileSync("./data/weather.json", "utf8");
          weatherEntries = JSON.parse(weatherEntries);
          let data = reduceWeatherData(response.data);
          weatherEntries.push({
            id: id,
            data: data,
            lat: destination.lat,
            lng: destination.lng
          });
          fs.writeFileSync(
            "./data/weather.json",
            JSON.stringify(weatherEntries)
          );
          resolve({
            id: id,
            data: data,
            lat: destination.lat,
            lng: destination.lng
          });
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

async function getForecastInterval(destination, id) {
  return new Promise(async function (resolve, reject) {
    try {
      var forecast = await weather
        .get(
          "report.json?apikey=&product=forecast_7days_simple&latitude=" +
            destination.lat +
            "&longitude=" +
            destination.lng +
            ""
        )
        .then(function (response) {
          let data = reduceWeatherData(response.data);
          resolve({
            id: id,
            data: data,
            lat: destination.lat,
            lng: destination.lng
          });
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
