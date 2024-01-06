const express = require ("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const accounts = require ("../models/accounts.js");
const router = express.Router();
const auth = require("../middleware/auth");
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require('uuid');
const verification = require("../models/verification.js");
const moment = require("moment");

router.post("/register", async (req, res) => {
    async function sendVerification(props){
      const uniqueString = uuidv4() + props._id
      const maillist = [
        props.email,
      ]
      
      let transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com", 
          port: 465, 
          secure: true, 
          auth: {
            user: "trainingandpolicies@kluedskincare.com", 
            pass: process.env.EMAIL_PASS, 
          },
          tls : { rejectUnauthorized: false }
      })

      const encryptedString = await bcrypt.hash(uniqueString, 10)

      let obj = {
        userid: props._id,
        encryptedstring: encryptedString,
        expiration: Date.now() + 259200000
      }

      const saveVerification = await verification.create(obj)
      if (saveVerification) {
        let formattedDate = moment(saveVerification.expiration).format('MMMM Do YYYY, hh:mm A')
        let info = await transporter.sendMail({
            from: '<trainingandpolicies@kluedskincare.com>',
            to: maillist,
            cc: '',
            subject: `Do Not Reply - Email Verification`,
            html: `
            <h4>Klued Email Account Verification</h4>
            <p>
                Hi ${props.firstname+" "+props.lastname},
                <br/>
                <br/>
                This email is sent to you in order to verify your email account that is registered to your account.
                Click <a href=${"https://kluedskincare.com/#/email-verification/"+props._id+"/"+uniqueString}>here</a> to continue with the process.
                <br/>
                <br/>
                This link will expire on <b>${formattedDate}</b>.
                <br/>
                <br/>
                <i>This is a system-generated email, please do not reply to this message.</i>
                <br/>
                <br/>
                Regards,
                <br/>
                <br/>
                <b>Klued Employee Portal</b>
                <br/>
                <img src="kluedlogo@kluedskincare.com"/>'
            </p>
            `, // Embedded image links to content ID
            attachments: [{
              filename: 'logo.png',
              path: './src/logo.png',
              cid: 'kluedlogo@kluedskincare.com' // Sets content ID
            }]
        })
      }
    }

    const user = await accounts.findOne({email: req.body.email})
    if (user){
        return res.status(200).send(false)
    }
    const newPassword = await bcrypt.hash(req.body.password, 10)
    try {
      let obj = {}
      req.body.type === "Customer" ?
      obj = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          type: req.body.type,
          email: req.body.email,
          password: newPassword,
          verified: false,
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
        access: JSON.parse(req.body.access),
        verified: false,
      }
      const addAccount = await accounts.create(obj)
      if (addAccount) {
        //handle user verification
        sendVerification(addAccount)
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
            type: login.type,
            phone: login.phone,
            department: login.department,
            job: login.job,
            createdAt: login.createdAt,
            email: login.email,
            displayimage: login.displayimage,
            access: login.access,
            verified: login.verified
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
    displayimage: user.displayimage,
    access: user.access,
    verified: user.verified
  })
})

router.get("/all-accounts", auth, async (req, res) => {
  try {
      const page = req.query.page
      const accountsPerPage = req.query.limit
      const startDate = req.query.startDate
      const endDate = req.query.endDate
      
      let condition = {createdAt: {$gte: startDate, $lte: endDate}}
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

router.post("/update-account/:id", auth, async (req, res) =>{
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
    res.status(200).send(true)
  } else {
    // if they are not uploading a new photo
    await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
    res.status(200).send(true)
  }
})

router.delete("/delete-account/:id", async (req, res) => {
  const doc = await accounts.findById(req.params.id)
  if (doc?.displayimage) {
      cloudinary.uploader.destroy(doc.displayimage)
  }
  const account = await accounts.findByIdAndDelete(doc)  
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

router.get("/check-password/:userid/:password", auth, async (req, res) => {
  try {
    const account = await accounts.findById(req.params.userid)
    const pass = await bcrypt.compare(req.params.password, account.password)
    res.status(200).send(pass)
  } catch (err) {
    console.log(err)
    res.status(200).send(false)
  }
})

router.post("/change-password/:userid/:password", async (req, res) => {
  const newPassword = await bcrypt.hash(req.params.password, 10)
  try {
    const account = await accounts.findByIdAndUpdate({_id: req.params.userid}, {password: newPassword})
    if (account) {
      res.status(200).send(true)
    }
    if (!account) {
      res.status(200).send(false)
    }
  } catch (err) {
    res.status(200).send(false)
  }
})

router.post("/update-account-info/:id", auth, async (req, res) => {
  const user = await accounts.findOne({email: req.body.email})
  if (user) {
    if (user._id.toString()!==new ObjectId(req.params.id).toString()){
        return res.status(200).send(false)
    }
  }
  try {
      let obj = {}
      req.body.type === "Customer" ?
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
        phone: req.body.phone,
        department: req.body.department,
        job: req.body.job,
        access: JSON.parse(req.body.access),
      }
      const info = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
      if (info) {
        res.status(200).json(true)
      }
  } catch (err) {
      console.log(err)
  }
})

module.exports = router