var amqp = require("amqplib/callback_api");
const readline = require("readline");

var args = process.argv.slice(2);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getLine = (function (msg) {
  console.log(msg);
  const getLineGen = (async function* () {
    for await (const line of rl) {
      yield line;
    }
  })();
  return async () => (await getLineGen.next()).value;
})();

if (args[0] == null) {
  init();
} else {
  listenTo(args[0]);
}

async function init() {
  console.log("Start:");
  let start = await getLine();
  console.log("Destination:");
  let destination = await getLine();
  let id = null;
  console.log({ start, destination });

  amqp.connect(
    "amqp://dtnuecqi:gGpHnyj_8HKgJC_w2okKeZZJmXxkEnsn@bee.rmq.cloudamqp.com/dtnuecqi",
    function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        channel.assertQueue(
          "",
          {
            exclusive: true
          },
          function (error2, q) {
            if (error2) {
              throw error2;
            }
            var correlationId = generateUuid();
            var msg = { start: start, destination: destination };
            msg = JSON.stringify(msg);

            console.log(" [x] Requesting ID");

            channel.assertExchange("subscription", "topic", {
              durable: false
            });

            channel.prefetch(1);

            channel.consume(
              q.queue,
              function (msg) {
                if (msg.properties.correlationId == correlationId) {
                  let id = parseInt(msg.content);
                  console.log(id);
                  channel.assertExchange("user_notification", "topic", {
                    durable: false
                  });
                  channel.bindQueue(
                    q.queue,
                    "user_notification",
                    id.toString()
                  );
                  channel.ack(msg);
                } else {
                  console.log(JSON.parse(msg.content.toString()));
                  channel.ack(msg);
                }
              },
              {
                noAck: false
              }
            );

            channel.publish("subscription", "sub.req", Buffer.from(msg), {
              correlationId: correlationId,
              replyTo: q.queue
            });
          }
        );
      });
    }
  );
}

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}
