//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const port = 3000;
const mongoose=require("mongoose");
const session=require('express-session');
const passport=require('passport');
const passportlocalMongoose=require('passport-local-mongoose');
const { request } = require('express');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate=require("mongoose-findorcreate");
// const encrypt=require("mongoose-encryption");
// const md5=require("md5"); 
const app = express();
// const bcrypt=require("bcrypt");
// const saltrounds=10;
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set('useCreateIndex',true);

const userSchema=mongoose.Schema({
    email:String,
    password:String,
    googleId:String
});
userSchema.plugin(passportlocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret:process.env.SECRET,encryptedFields:["password"] });

const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get("/",function(req,res)
{
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [  'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));
app.get("/login",function(req,res)
{
    res.render("login");
});

app.get("/register",function(req,res)
{
    res.render("register");
});
app.get("/secrets",function(req,res)
{
    if(req.isAuthenticated())
    {
        res.render("secrets");
    }
    else
    {
        res.redirect("/login");
    }
});
app.post("/register",function(req,res)
{
    User.register({username:req.body.username},req.body.password,function(err,user)
    {
        if(err)
        {
            console.log(err);
            res.redirect("/register");
        }
        else
        {
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            });
        }
    })
});
app.post("/login",function(req,res)
{
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user, function(err)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            passport.authenticate('local')(req,res,function()
            {
                res.redirect("/secrets");
            });
        }
    });
});
app.get('/logout',function(req,res)
{
    req.logout();
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
