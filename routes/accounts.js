const express = require ("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const accounts = require ("../models/accounts.js");
const router = express.Router();
const auth = require("../middleware/auth");
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2

router.post("/register", async (req, res) => {
    const user = await accounts.findOne({email: req.body.email})
    if (user){
        return res.status(200).send(false)
    }
    const newPassword = await bcrypt.hash(req.body.password, 10)
    try {
        let obj = {}
        req.body.type !== "Staff" ?
        obj = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            type: req.body.type,
            email: req.body.email,
            password: newPassword,
        }
        :
        obj = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          type: req.body.type,
          email: req.body.email,
          password: newPassword,
          phone: req.body.phone,
          department: req.body.department,
          job: req.body.job,
        }
        const addAccount = await accounts.create(obj)
        if (addAccount) {
            res.status(200).json(true)
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/login", async (req, res) =>{
    const login = await accounts.findOne({email: req.body.email})
    if ( !login) {
      res.send(false)
    }
    if ( login ) {
      const pass = await bcrypt.compare(req.body.password, login.password)
      if (!pass) {
        res.send(false)
      }
      if (pass) {
        const token = jwt.sign({ _id: login._id }, process.env.JWT_SECRET);
        res.json({
          token: token,
          user: {
            _id: login._id,
            firstname: login.firstname,
            lastname: login.lastname,
            type: login.type
          }
        })
      }
    }
})

router.get("/user-data", auth, async (req, res) => {
  const user = await accounts.findById(req.user._id)

  res.json({
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    type: user.type,
    phone: user.phone,
    department: user.department,
    job: user.job,
    createdAt: user.createdAt,
    email: user.email,
    displayimage: user.displayimage
  })
})

router.get("/all-accounts", auth, async (req, res) => {
  try {
      const page = req.query.page
      const accountsPerPage = req.query.limit
      const startDate = req.query.startDate
      const endDate = req.query.endDate
      
      let condition = {createdAt: {$gte: startDate, $lt: endDate}}
      const allAccount = await accounts.find(condition).skip(page*accountsPerPage).limit(accountsPerPage)
      const allAccounts = await accounts.find(condition)
      
      let a = Math.floor(allAccounts.length/accountsPerPage)
      let b = allAccounts.length%accountsPerPage

      if (b!==0) {
          a=a+1
      }

      const obj = {
          sortedAccounts: allAccount,
          totalAccounts: a,
          total: allAccounts.length
      }
      res.status(200).json(obj)
  }catch (err) {
      console.log(err)
      res.status(500).json(err)
  }
})

router.post("/update-account/:id", async (req, res) =>{
  const obj = {
    firstname: req.body.firstname, 
    lastname: req.body.lastname,
    phone: req.body.phone,
  }
  if (req.body.displayimage) {
    // if they are uploading a new photo
    obj.displayimage = req.body.displayimage
    const info = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
    if (info.displayimage) {
      cloudinary.uploader.destroy(info.displayimage)
    }
    res.send(true)
  } else {
    // if they are not uploading a new photo
    await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
    res.send(true)
  }
})

router.delete("/delete-account/:id", async (req, res) => {
  if (typeof req.params.id != "string") req.params.id = ""
      const doc = await accounts.findOne({ _id: new ObjectId(req.params.id) })
  if (doc?.displayimage) {
      cloudinary.uploader.destroy(doc.displayimage)
  }
  const account = await accounts.deleteOne(doc)  

  if (account) {
    res.status(200).json(account)
  } else {
    res.status(500).json(false)
  }
})

router.get("/get-profile", async (req, res) => {
  try {
      const searchProfile = await accounts.findById(req.query.profileid)
      res.status(200).json(searchProfile)
  }catch (err) {
      console.log(err)
      res.status(500).json(err)
  }
})

module.exports = router