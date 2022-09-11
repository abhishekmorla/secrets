//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
mongoose.connect("mongodb://localhost:27017/userDB");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set("view engine", "ejs");

// first create user schema
// then model
// take the input from register and save in userDB

// first create user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

//encryption level 1
const secret = process.env.SECRET_KEY;
// before creating model
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

// then model
const User = mongoose.model("User", userSchema);

// take the input from register and save in userDB

app.post("/register", function (req, res) {
  const details = req.body;
  //   console.log(details.username);
  //   console.log(details.password);
  const newUser = new User({
    username: details.username,
    password: details.password,
  });
  newUser.save(function (err) {
    if (!err) {
      res.render("secrets");
    }
  });
});

app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ username: username }, function (err, founduser) {
    console.log(founduser);
    if (err) {
      console.log(err);
    } else {
      if (founduser) {
        if (founduser.password === password) {
          res.render("secrets");
        }
      }
    }
  });
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.listen(process.env.PORT || 1337, function () {
  console.log("Started eh?");
});
