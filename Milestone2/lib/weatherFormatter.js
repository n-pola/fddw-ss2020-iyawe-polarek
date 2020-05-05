

module.exports = function weatherFormatter(msgJSON) {
    var outMsg = "";
    for (let index = 0; index < msgJSON.weather.forecast.length; index++) {
        const elem = msgJSON.weather.forecast[index];
        let date = new Date(elem.utcTime);
        date = date.toDateString();
        outMsg = outMsg + `${date}: ${elem.highTemperature} \n`;
    }
    return outMsg
}