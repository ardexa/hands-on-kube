const amqp = require('amqplib');
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');

const app = express();
const taskQueueName = 'task_queue';
const results = {};
let pubChannel;

function createReplyChannel(conn) {
  let replyChannel;
  return conn.createChannel()
    .then(ch => {
      replyChannel = ch;
      return replyChannel.assertQueue('reply', {durable: false});
    })
    .then(() => replyChannel.consume('reply', msg => {
      console.log(` [x] Received '${msg.content.toString()}'`);
      const reply = JSON.parse(msg.content.toString());
      results[reply.id] = results[reply.id] || [];
      results[reply.id].push(reply);
    }, {noAck: true}));
}

function createPubChannel(conn) {
  return conn.createChannel()
    .then(ch => {
      pubChannel = ch;
      return pubChannel.assertQueue(taskQueueName, {durable: true});
    });
}

amqp.connect('amqp://broker')
  .then(conn => Promise.all([
    createPubChannel(conn),
    createReplyChannel(conn),
  ]))
  .catch(console.warn);

app.use(bodyParser.json());
app.use(morgan('dev'));

let counter = 0;
let workCount = 0;
app.get('/api/', (req, res) =>
  res.send(`Hello World ${++counter}!`));
app.delete('/api/', () => process.exit(1));
// New stuff ----------
app.get('/api/work', (req, res) => res.send(results));
app.post('/api/work', (req, res) => {
  if (!req.body.msg || !req.body.count) {
    return res.sendStatus(400);
  }
  const id = ++workCount;
  for (let i = 0; i < req.body.count; ++i) {
    const task = {
      id,
      msg: req.body.msg,
    };
    pubChannel.sendToQueue(taskQueueName,
      Buffer.from(JSON.stringify(task)),
      {deliveryMode: true});
  }
  console.log(` [x] Sent '${id}'`);
  res.status(202).send({id});
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
