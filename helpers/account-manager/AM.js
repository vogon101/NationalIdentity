function AccountManager (db, c) {
    
    this.db = db;
    this.users = db.get('users');
    this.tokens = db.get('tokens');
    this.crypto = c;
    
    this.login = function (username, password, callback) {
        console.info("[NOTICE] Login attempt for " + username)
        var AM = this;
        //Find all users with the correct username
        this.users.find({username:username}, function (err, docs) {
            if (err) {
                callback({error: "Error in database connection"});
                return
            }
            else {
                //No user found, bad username
                if (docs.length == 0) {
                    callback({error: "User not found", auth: false})
                    return 
                }
                //More than one user found
                //THIS SHOULD NEVER HAPPEN
                if (docs.length > 1) {
                    callback({error: "More than one user found"})
                    return
                }
                
                var user = docs[0];
                //Hash the password
                var hasher = AM.crypto.createHash('sha256')
                hasher.update(password);
                var hash = hasher.digest('hex');
                console.log(hash)
                //Check the password
                if (hash == user.password) {
                    //See if the user has a valid token already
                    AM.hasValidToken (username, function (res) {
                        //If yes, return that token
                        if (res.hasToken) {
                            callback({auth:true, token: res.token.token})
                        }
                        //If not generate a new one
                        else {
                            token = AM.generateToken(username);   
                            callback({auth:true, token: token, generated:true})
                        }
                    });
                }
                else
                    callback({error: "Bad Password", auth:false})
            }      
        })
    }
    
    //Generate a new token
    this.generateToken = function (username, insert) {
        if (insert == undefined) {
            insert = true;
        }
        //Random number to generate token
        var random = Math.floor(Math.random() * 9999999999) + 1; 
        //Final string to be hashed
        var tokenString = "_" + username + "_" + random + "_" + new Date().getTime() + "_";
        //Create the hash
        var hasher = this.crypto.createHash('sha256');
        hasher.update(tokenString)
        var token = hasher.digest('hex')
        
        //If needed, insert into db
        if (insert) {
            //Timeout time (30 mins after now)
            var time = new Date().getTime() + (1000*60*30);
            //Insert the token
            this.tokens.insert({token:token, timeout:time, username:username, active: true}, function (err, doc) {
                if (err) throw err;
                console.info("[NOTICE] New token generated for user " + username)
            });
            
        }
        return token;        
    }
    
    //See if a user already has aj valid token
    this.hasValidToken = function (username, callback) {
        var AM = this;
        //Find all valid tokens for a user
        this.tokens.find({username:username, active:true}, function (err, docs) {
            if (err) throw err;
            //If there is no token, return null
            if (docs[0] == undefined) {
                console.info("[NOTICE] No valid token found for " + username + " (None Returned)")
                callback({hasToken: false, token: null});
                return;
            }
            token = docs[0]
            //See if the token has timed-out
            //If no, return the token
            if (token.timeout > new Date().getTime()) {
                callback({hasToken: true, token:token});
                console.info("[NOTICE] Valid token found for "+ username)
                return;
            }
            //If yes, update that token to no-longer be active 
            else {
                console.info("[NOTICE] Token expired for user " + username)
                AM.tokens.update({username: username}, { $set : {active: false} }, {multi:true})
                callback({hasToken: false, token: null});
                return;
            }
        });
    }
    
    this.checkToken = function (token, username, callback) {
        var AM = this;
        //Find the token in the database
        this.tokens.find({username:username, active:true, token:token}, function (err, docs) {
            if (err) throw err;
            //If there is no token, return false
            if (docs[0] == undefined) {
                callback({valid: false});
                return;
            }
            token = docs[0]
            //See if the token has timed-out
            //If no, return the token
            if (token.timeout > new Date().getTime()) {
                console.info("[NOTICE] Suggested token valid for "+ username)
                callback({valid: true});
                return;
            }
            //If yes, update that token to no-longer be active 
            else {
                console.info("[NOTICE] Token expired for user " + username)
                AM.tokens.update({username: username}, { $set : {active: false} }, {multi:true})
                callback({valid: false});
                return;
            }
        });
    }
    
    this.secure = function (req, callback) {
        if (req.session.token) {
            var token = req.session.token
            this.checkToken(token.token, token.username, function (res) {
                if (res.valid) {
                    callback({secure: true, message:"Valid token object found"})
                }
                else {
                    callback({secure: false, message:"No session token"});
                }
            });
        }
        else {
            callback({secure: false, message:"No session token"});
        }
    }
    
    this.secureResponse = function (req, res, unsecurePage, securePage, pageOptions, log) {
        if (log == undefined)
            log=false
        var AM = this
        this.secure (req, function (seq) {
            if (log)
                console.dir(seq)
            if (seq.secure) {
                if (log)
                    console.info("Secure");
                AM.getUserFromToken(req.session.token.token, function (r) {
                    pageOptions.user = r
                    pageOptions.secure = true
                    res.render(securePage, pageOptions);       
                })
            }
            else { 
                res.redirect(unsecurePage)
            }
        }); 
    }
    
    this.addUser = function (username, email, password, callback) {            
        var AM = this
        console.log(password)
        AM.users.find({username:username}, function (err, docs) {
            if (docs.length > 0)
                callback({error: "Username already taken"})
            else {
                AM.users.find({email: email}, function (err, docs) {
                    
                    if (docs.length > 0)
                        callback({error: "Email already in use"})
                    else {
                        var hasher = AM.crypto.createHash('sha256')
                        hasher.update(password);
                        var hash = hasher.digest('hex');
                        AM.users.insert({username: username, email:email, password: hash})
                        console.info("[NOTICE] User "+ username + " created")
                        callback({success: "User " + username + " sucessfully created"})
                    }
                });
            }
        })
    }
    
    this.setup = function () {
        this.users.ensureIndex({username: 1}, {unique: true})
        this.users.ensureIndex({email: 1}, {unique: true})
        this.tokens.ensureIndex({token:1}, {unique:true})
        
    }
    
    this.getUserObject = function (username, callback) {
        this.users.find({username: username}, function (err, docs) {
            if (docs.length < 1)
                callback({error:"User not found"})
            else {
                callback(docs[0])   
            }
        })
    }
    
    this.getUserFromToken = function (tokenid, callback) {
        var AM = this
        this.tokens.find({token: tokenid}, function (err, docs) {
            console.log(tokenid)
            if (docs.length < 1)
                callback({error: "Token not found"})
            else
                AM.getUserObject (docs[0].username, callback)
        })
    }
    
    this.routes = require("./routes");
    
}

module.exports = AccountManager
module.exports = AccountManager