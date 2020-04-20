
const fetch = require('node-fetch')


async function getWeather() {
    const api_link = `http://api.weatherstack.com/current?access_key=$o3WSR0dZbNY3c1m3eUysoy48ljP9EILIkJJxZcpSC7E&query=Cologne,`
    try {
        const res = await fetch(api_link)
        const response =  await res.json()
        console.log(response)
    } catch (error) {
        console.log("Ein Fehler ist aufgetreten: %s", error)
    }
}



module.exports = getWeather()