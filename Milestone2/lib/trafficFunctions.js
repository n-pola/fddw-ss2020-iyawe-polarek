require("dotenv").config();
const axios = require("axios");

const here = axios.create({
  baseURL: process.env.LOCATION_BASE
});

const route = axios.create({
  baseURL: process.env.ROUTE_BASE
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

function fetchTraffic(start, startDate, destionation) {
  return new Promise(async function (resolve, reject) {
    try {
      let startLocation = await getLocation(start);
      let destinationLocation = await getLocation(destionation);
      var date = new Date(startDate + " GMT");
      date = date.toISOString();
      route
        .get(
          "routes?transportMode=car&origin=" +
            startLocation.lat +
            "," +
            startLocation.lng +
            "&destination=" +
            destinationLocation.lat +
            "," +
            destinationLocation.lng +
            "&return=summary&departureTime=" +
            date +
            "&apikey=" +
            process.env.HERE_KEY
        )
        .then(function (response) {
          let resp = {
            duration: response.data.routes[0].sections[0].summary.duration
          };
          resolve(resp);
        })
        .catch(function (error) {
          throw error;
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const check = async function (dbo, channel, id) {
  return new Promise(async function (resolve, reject) {
    try {
      dbo
        .collection("entries")
        .findOne({ id: id }, async function (err, result) {
          await asyncForEach(result.cars, async function (elem, index, array) {
            var getTraffic = await fetchTraffic(
              elem.start,
              result.startDate,
              result.destination
            );

            if (!(JSON.stringify(elem.data) === JSON.stringify(getTraffic))) {
              let msg = {
                id: id,
                newDuration: getTraffic.duration,
                oldDuration: elem.data.duration,
                passengers: elem.passengers
              };
              result.cars[index].data = getTraffic;
              let topic = result.id + ".traffic." + elem.carID;
              channel.publish(
                "combine_select",
                topic,
                Buffer.from(JSON.stringify(msg))
              );
            }
          });

          dbo
            .collection("entries")
            .replaceOne({ _id: result._id }, { $set: result }, function (
              err,
              res
            ) {
              if (err) throw err;
              resolve(`checked ${id}`);
            });
        });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  check
};
