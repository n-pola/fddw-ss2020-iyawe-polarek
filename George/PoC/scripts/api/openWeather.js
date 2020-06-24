
const fetch = require('node-fetch')


async function getWeather() {
    const api_link = `http://api.weatherstack.com/current?access_key=&query=Cologne,`
    try {
        const res = await fetch(api_link)
        const response =  await res.json()
        console.log(response)
    } catch (error) {
        console.log("Ein Fehler ist aufgetreten: %s", error)
    }
}
 console.log(process.env.WEATHERSTACK_API_KEY)


module.exports = getWeather()
