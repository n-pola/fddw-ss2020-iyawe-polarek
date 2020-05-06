module.exports = function (res) {
    var topics = "";
    for (var index = 0; index <= res.traffic.length; index++) {
        if (res.traffic[index] != undefined) {
            topics += `traffic.${res.traffic[index].carID}` + "\n"
        }
        else {
            return topics;
        }

    }
    return topics;
}


