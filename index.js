const express = require ("express");
const cors = require ("cors");
const path = require ("path");
const mongoose = require ("mongoose");
const dotenv = require ("dotenv");
dotenv.config()

const productRoute = require ('./routes/products');
const packageRoute = require ('./routes/package');
const cloudRoute = require ('./routes/cloudinary');
const emailsRoute = require ('./routes/emails');
const accountsRoute = require ('./routes/accounts');
const tokenRoute = require ('./routes/token');
const orderRoute = require ('./routes/orders');
const ticketRoute = require ('./routes/tickets');
const reviewsRoute = require ('./routes/reviews');
const vouchersRoute = require ('./routes/vouchers');
const videosRoute = require ('./routes/videos');
const reportsRoute = require ('./routes/reports');

//mongoose.connect("mongodb://0.0.0.0:27017/kluedskincare", {
mongoose.connect(process.env.CONNECTIONSTRING , {
})

const app = express();
app.use(cors());
app.use(express.json()); // Add this line to parse incoming JSON data
app.use(express.urlencoded({ extended: false }));
app.use("/product", productRoute)
app.use("/", cloudRoute)
app.use("/emails", emailsRoute)
app.use("/package", packageRoute)
app.use("/accounts", accountsRoute)
app.use("/token", tokenRoute)
app.use("/orders", orderRoute)
app.use("/tickets", ticketRoute)
app.use("/reviews", reviewsRoute) 
app.use("/vouchers", vouchersRoute) 
app.use("/videos", videosRoute) 
app.use("/reports", reportsRoute) 

app.get('/', async (req, res) => {
  return res.json("Server loaded.");
})

app.listen(8000, () => {
  console.log('Server running...');
});

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