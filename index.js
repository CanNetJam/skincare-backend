const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
/*
//locate index.html to serve during first load
app.use(express.static('../client/dist'))
//serve front end pages after manual reload
app.get('*', function (request, response){
  response.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'))
})
app.get('/', async (req, res) => {
  return res.render("index", {});
});
*/
app.use(cors());
app.use(express.json()); // Add this line to parse incoming JSON data


/*******************************************************************************************************/
app.get('/', async (req, res) => {
  return res.json("Hello user");
})

app.listen(8000, () => {
  console.log('Server running...');
});
