var fs = require("fs");
const axios = require("axios");

function getLocation(locationName) {
  return new Promise(async function (resolve, reject) {
    try {
      locationName = locationName.replace(" ", "+");
      locationName = locationName.replace(",", "%2C");

      here
        .get(
          "/geocode?q=" +
            locationName +
            "&apikey="
        )
        .then(function (response) {
          resolve(response.data);
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

const here = axios.create({
  baseURL: "https://geocode.search.hereapi.com/v1/"
});

const createID = async function ({ start, destination }) {
  return new Promise(async function (resolve, reject) {
    try {
      let subscriptions = fs.readFileSync("./data/subscriptions.json", "utf8");
      subscriptions = JSON.parse(subscriptions);
      start = await getLocation(start);
      start = {
        lat: start.items[0].position.lat,
        lng: start.items[0].position.lng
      };
      destination = await getLocation(destination);
      destination = {
        lat: destination.items[0].position.lat,
        lng: destination.items[0].position.lng
      };

      var result = subscriptions.filter(
        (elem) =>
          elem.start.lat == start.lat &&
          elem.destination.lat == destination.lat &&
          elem.start.lng == start.lng &&
          elem.destination.lng == destination.lng
      );

      if (result.length) {
        resolve({ type: "found", ...result[0] });
      } else {
        var id = subscriptions[subscriptions.length - 1].id + 1;
        let newEntry = { id: id, start: start, destination: destination };
        subscriptions.push(newEntry);
        fs.writeFileSync(
          "./data/subscriptions.json",
          JSON.stringify(subscriptions)
        );
        resolve({ type: "new", ...newEntry });
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  createID
};
