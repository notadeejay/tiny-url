const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080
var cookieSession = require('cookie-session')
const bcrypt = require('bcrypt');
app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'],

}))

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));


//URL database
const urlDatabase = {
"b2xVn2": {
      "shortURL":"b2xVn2",
      "longURL": "http://www.lighthouselabs.ca",
      "userID": "userRandomID"
  },
"9sm5xK" : {
      "shortURL" : "9sm5xK",
      "longURL": "http://www.google.com",
      "userID" : "user2RandomID"
   }
};

//User database
const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync('123', 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync('456', 10)
  }
};



//Generates a random id & random shortURL
function generateRandomString() {
  let shorty = "";
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  do {
    for (let i = 0; i < 6; i++) {
      shorty += chars.charAt(Math.floor(Math.random() * chars.length));
    }

  } while (urlDatabase[shorty])
  return shorty
}



//Checks if a user e-mail is already in the database
function findUserEmail (email) {
  let found = "";

  for (let key in users) {
    if (users[key].email === email) {
      found = key
    }
  }
  return found
}



//Identifies the current user's cookie
function currentUser(req) {
  for (let user in users) {
    if (req.session.user_id === user) {
      return user;
    }
  }
  return "";
}



//homepage
app.get("/", (req, res) => {
    res.send('Hello!')
});




//registration page
app.get("/register", (req, res) => {
  let userID = currentUser(req)

  if (userID) {
    res.redirect('/urls/new')
  } else {
 res.render("./pages/register")
}
});



//register for an acct
app.post("/register", (req, res) => {
 let email = req.body.email;
 let password = req.body.password;
 const hashword = bcrypt.hashSync(password, 10);
 let id = generateRandomString();

  // if e-mail and password are empty strings
  if (!(email && password)) {
    res.statusCode = 401
    res.send('Enter a valid e-mail and password to register')
  };

  //if email already exists
  if (findUserEmail(email)) {
    res.statusCode = 401;
    res.send("The email you entered is already registered with an account.");
  } else {
   let newUser = {
    id: id,
    email : email,
    password: hashword
  }

  users[id] = newUser
  req.session.user_id = id
  res.redirect('/urls')

  }

});



//login page
app.get("/login", (req, res) => {
 res.render("./pages/login")
});



//logging in using e-mail and password
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  let foundID = findUserEmail(email);
  let loginCheck = false
  let currentUser = "";

  //checking for e-mail in the database
  if (!foundID) {
    res.statusCode = 403;
    res.send("The email you entered cannot be found.")
  }

  if (foundID) {
   loginPassed = bcrypt.compareSync(password, users[foundID].password);
  }

  //if the passwords match
  if (loginPassed) {
    currentUser = foundID
    req.session.user_id = users[foundID].id
    res.redirect('/urls')
  } else {
    res.status = 401;
    res.send('Sorry, that email and password combination is incorrect. <br><a href="/login">Return</a>');
  }

  });



//logout and clear cookies
app.post("/logout", (req, res) => {
  req.session = null
  res.redirect("/login");
  return;
});



//list the users shortlinks
app.get("/urls", (req, res) => {
  let templateVars = {};
  let linksArray = [];
  let userID = currentUser(req);

  //check if the user is logged in
  if (!userID) {
   return res.send('You need to <a href="/login">login</a>');
  }

  //shows only the users unique links
  for (let link in urlDatabase) {
    if (urlDatabase[link].userID === userID) {
     linksArray.push(urlDatabase[link])
    }
  }

  templateVars = {
    urls: linksArray,
    user: users[req.session.user_id],
    useremail: users[req.session.user_id].email
  }

  res.render("./pages/urls_index", templateVars)

});



//create new short link
app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id],
    useremail: users[req.session.user_id].email
  }

  if (currentUser(req)) {
     res.render("./pages/urls_new", templateVars);
   } else {
    res.redirect('/login');
  }

});



//redirect the shortURL to it's original longURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  let longURL = "";

  for (link in urlDatabase) {
    if (urlDatabase[link].shortURL === shortURL) {
      longURL = urlDatabase[link].longURL;
    }
  }

  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send('Sorry, this URL does not exist 🦄');
  }

});


//// /^http:\/\//)

//add new short URL pairing to database
app.post("/urls", (req, res) => {
    let shortURL = generateRandomString();
    let longURL = req.body.longURL

    if (!longURL.match(/^https?:\/\//)) {
      longURL = 'https://' + longURL
    }

    urlDatabase[shortURL] = {
      longURL : longURL,
      shortURL: shortURL,
      userID: users[req.session.user_id].id
  }

    res.redirect('/urls')
});



//delete from database
app.post("/urls/:id/delete", (req, res) => {
  let shortURL = req.params.id
  delete urlDatabase[shortURL]
  res.redirect("/urls");
});



//look at specific shortlink
app.get("/urls/:id", (req, res) => {
  let userID = currentUser(req);
  let templateVars = {};

  if (userID) {
    if (!urlDatabase[req.params.id]){
      return res.status(404).send('This Tiny URL does not exist 🦄')
      //if the URL does not belong to the user
    } else if (urlDatabase[req.params.id].userID != userID) {
      return res.send('Sorry, URL does not belong to you 🤷‍')
    } else {
      templateVars = {
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id],
      user: users[req.session.user_id],
      useremail: users[req.session.user_id].email
      };
      res.render("./pages/urls_show", templateVars);
    }
  } else {
    return res.status(401).redirect('/login');
  }
});



//edit the longURL for a given shortURL
app.post("/urls/:shortURL", (req, res) => {
  let userID = currentUser(req);
  let shortURL = req.params.shortURL
  let longURL = req.body.updateURL

//make sure user is logged in
  if (!userID) {
   return res.status(401).send('You need to <a href="/login"login</a>');
  }
  //make sure the URL belongs to the user
  if (urlDatabase[shortURL].userID != userID) {
    res.send('Sorry, URL does not belong to you.')
  } else {
    urlDatabase[shortURL]['longURL'] = longURL
    res.redirect('/urls')
  }

});


app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});



//~~~~~ MAGIC LAND ~~~~
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}!`);
});