const sToTime = require("./sToTime")
module.exports = function carCounter(res) {
    var cars = " ";
    for (var index = 0; index <= res.traffic.length; index++) {
        if (res.traffic[index] != undefined) {
            cars += `🚗 ${index}:   ` + sToTime(res.traffic[index].duration) + "\n"
        }
        else {
            return cars;
        }

    }
    return cars;
}
