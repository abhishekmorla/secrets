//jshint esversion:6
require("dotenv").config();
const md5 = require("md5");
const fs = require("fs");
const https = require("https");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(
  session({
    secret: "ourlongsecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

//google auth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://localhost:3000/auth/google/secret",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile._json.email);
      User.findOrCreate(
        { googleId: profile.id, username: profile._json.email },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

//Facebook auth
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "https://localhost:3000/auth/facebook/secret",
      profileFields: ["id", "emails", "name"],
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile.emails[0].value);
      User.findOrCreate(
        { facebookId: profile.id, username: profile.emails[0].value },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

mongoose.connect("mongodb://localhost:27017/userDB");

// first create user schema
// then model
// take the input from register and save in userDB

// first create user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String, // added later when you want to add another doc to particular user like post
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//encryption level 1
// const secret = process.env.SECRET_KEY;
// before creating model
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

// then model
const User = mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

// take the input from register and save in userDB
app.post("/register", function (req, res) {
  const details = req.body;
  // console.log(details.username);
  // console.log(details.password);
  // bcrypt.hash(details.password, saltRounds, function (err, hash) {
  // Store hash in your password DB.
  //   const newUser = new User({
  //     username: details.username,
  //     password: hash,
  //   });
  //   newUser.save(function (err) {
  //     if (!err) {
  //       res.render("secrets");
  //     }
  //   });
  // });

  // SESSION
  User.register(
    { username: details.username },
    details.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        // will only execute if its success
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password; // got from user input
  // User.findOne({ username: username }, function (err, founduser) {
  //   // founduser is from database
  //   console.log(founduser);
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (founduser) {
  //       bcrypt.compare(password, founduser.password, function (err, result) {
  //         if (result === true) {
  //           res.render("secrets");
  //         }
  //       });
  //     }
  //   }
  // });
  const user = new User({
    username: username,
    password: password,
  });

  req.logIn(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", function (req, res) {
  console.log(req.body.secret);
  console.log(req.user);
  User.findOneAndUpdate(
    { _id: req.user.id },
    { secret: req.body.secret },
    function (err, founduser) {
      if (!err) {
        res.redirect("/secrets");
      } else {
        console.log(err);
      }
    }
  );
});
app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  })
);

app.get(
  "/auth/google/secret",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get(
  "/auth/facebook/secret",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/secrets", function (req, res) {
  // if (req.isAuthenticated()) {
  //   res.render("secrets", { user: currentuser });
  // } else {
  //   res.redirect("/login");
  // }
  User.find({ secret: { $ne: null } }, function (err, founduser) {
    console.log(founduser);
    if (err) {
      console.log(err);
    } else {
      if (founduser) {
        res.render("secrets", { usersecrets: founduser });
      }
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit", { user: req.user.username });
  } else {
    res.redirect("/login");
  }
});
const httpsOptions = {
  key: fs.readFileSync("cert/key.pem"),
  cert: fs.readFileSync("cert/cert.pem"),
};
const server = https.createServer(httpsOptions, app).listen(3000, () => {
  console.log("server running at ");
});
