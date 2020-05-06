# Installation

* in diesem Ordner `npm install` ausführen
* eine Datei mit dem Namen `.env` anlegen, welche folgende Infomationen enthält:
  * `AMQP_URL=""` URL zum RabbitMQ Message Broker auf [cloudamqp](https://www.cloudamqp.com/)
  * `WEATHER_BASE="https://weather.ls.hereapi.com/weather/1.0/"`
  * `LOCATION_BASE="https://geocode.search.hereapi.com/v1/"`
  * `ROUTE_BASE="https://router.hereapi.com/v8/"`
  * `HERE_KEY=""` einen HERE API Key
  * `MONGO_BASE=""` URL zu einem MongoDB Server
  * `TELEGRAM=""`der Telegram Bot token
  * `DISCORD=""`der Discord Bot Token
* Daraufhin können alle Service nach einander gestartet werden und das System ist z.B. über den Telegram Bot [t.me/fddw_bot](t.me/fddw_bot) zu erreichen

# Befehle
* ### `/register ZielOrt StartDatum EndDatum` Eine Reisegruppe registrieren
  * `ZielOrt` ist ein String der den Zielort der gesamten Reisgruppe angibt (jeder hat das gleiche Ziel)
  * `StartDatum` gibt den Start der Reise an, im format (yyyy-mm-dd)
  * `EndDatum` gibt das Ende der Reise an, im format (yyyy-mm-dd)
* ### `/sub GroupID Topics` Einer Reisegruppe "folgen"
  * `GroupID` ist die ID der gemeinsamen Reisgruppe
  * `Topics` kann eine Liste von mehrern Topics sein, wie zum Beispiel weather, traffic, traffic.6 oder all
* ### `/unsub GroupID` Einer Reisegruppe "entfolgen"
  * `GroupID` ist die ID der gemeinsamen Reisgruppe
* ### `/info GroupID` Erhalte alle aktuellen Daten einer Gruppe (einmalig)
  * `GroupID` ist die ID der gemeinsamen Reisgruppe
* ### `add GroupID StartOrt Insassen` Erstellt ein route für ein Auto inklusive Insassen
  * `GroupID` ist die ID der gemeinsamen Gruppe
  * `StarOrt` ein Ort von dem aus der Teil der Gruppe startet (z.b. "Berlin")
  * `Insassen` eine Liste von String getrennt durch Leerzeichen, um Autos voneinander unterscheiden zu können und zb nur einem bestimmten Auto zu folgen
