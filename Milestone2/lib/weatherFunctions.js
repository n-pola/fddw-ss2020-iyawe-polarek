require("dotenv").config();
const axios = require("axios");
const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGO_BASE;

const here = axios.create({
  baseURL: process.env.LOCATION_BASE
});

const weather = axios.create({
  baseURL: process.env.WEATHER_BASE
});

function getLocation(locationName) {
  return new Promise(async function (resolve, reject) {
    try {
      locationName = locationName.replace(" ", "+");
      locationName = locationName.replace(",", "%2C");

      here
        .get("/geocode?q=" + locationName + "&apikey=" + process.env.HERE_KEY)
        .then(function (response) {
          resolve(response.data.items[0].position);
        })
        .catch(function (error) {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
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

function getWeather(lat, lng) {
  return new Promise(async function (resolve, reject) {
    try {
      weather
        .get(
          "report.json?apikey=" +
            process.env.HERE_KEY +
            "&product=forecast_7days_simple&latitude=" +
            lat +
            "&longitude=" +
            lng +
            ""
        )
        .then(function (response) {
          let data = reduceWeatherData(response.data);
          resolve({
            data: data
          });
        })
        .catch(function (error) {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

const getForecast = async function (destination) {
  return new Promise(async function (resolve, reject) {
    try {
      let location = await getLocation(destination);
      let forecast = await getWeather(location.lat, location.lng);
      resolve(forecast);
    } catch (error) {
      reject(error);
    }
  });
};

const updateEntry = function (dbo, id, data, destination) {
  return new Promise(async function (resolve, reject) {
    try {
      dbo.collection("entries").findOne({ id: id }, function (err, result) {
        console.log(result);
        if (result == null) {
          obj = { id: id, data: data, destination: destination };
          dbo.collection("entries").insertOne(obj, function (err, res) {
            resolve("initial");
          });
        } else {
          if (JSON.stringify(result.data) === JSON.stringify(data)) {
            resolve("noChange");
          } else {
            obj = { id: id, data: data, destination: destination };
            dbo
              .collection("entries")
              .updateOne({ _id: result._id }, obj, function (err, res) {
                resolve("update");
              });
          }
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  getForecast,
  updateEntry
};
