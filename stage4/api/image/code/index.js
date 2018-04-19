const express = require('express');
const morgan = require('morgan');
const app = express();

app.use(morgan('dev'));

let counter = 0;
app.get('/api/', (req, res) =>
  res.send(`Hello World ${++counter}!`));
app.delete('/api/', () => process.exit(1));

app.listen(3000, () =>
  console.log('Example app listening on port 3000!'));
