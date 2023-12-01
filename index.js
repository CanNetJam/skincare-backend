import express from "express";
import productRoutes from "./routes/products.js";
import cors from "cors";
import path from "path";
import mongodb from "mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config()

//mongoose.connect("mongodb://0.0.0.0:27017", {
mongoose.connect(process.env.CONNECTIONSTRING , {
})

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
const app = express();
app.use(cors());
app.use(express.json()); // Add this line to parse incoming JSON data
app.use("/create-product", productRoutes)

/*******************************************************************************************************/
app.get('/', async (req, res) => {
  return res.json("Hello user");
})


app.listen(8000, () => {
  console.log('Server running...');
});
