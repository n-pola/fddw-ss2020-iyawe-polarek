module.exports = function sToTime(duration) {
    (minutes = Math.floor((duration / 60) % 60)),
        (hours = Math.floor((duration / (100 * 60)) % 24));

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    return hours + " hours and  " + minutes + " minutes";
}

