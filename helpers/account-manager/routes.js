var express = require('express');
var router = express.Router();

router.get ('/login', function (req, res, next) {
    res.render('user/login', {error: req.query.error, success: req.query.success}) 
});

router.post ('/login', function (req, res, next) {
    req.AM.login(req.body.username, req.body.password, function (result) {
        if (result.auth) {
            req.session.token = {token: result.token, username:req.body.username};
            res.redirect('/app/');
        }
        else {
            res.redirect('/user/login?error=Username or password incorrect');   
        }
    });
});

router.get ('/logout', function (req, res, next) {
    req.session.token = null
    res.redirect('/user/login');
});

router.get ('/signup', function (req,res,next) {
   res.render('user/signup', { }); 
});

router.post('/signup', function (req, res, next) {
    if (req.body.password != req.body.passwordConfirm) {
        res.render("user/signup", {error: "Passwords do not macth"})
        return
    }
    else {
        req.AM.addUser(req.body.username, req.body.email, req.body.password, function (r) {
            if (r.error)
                res.render("user/signup", {error: r.error})
            else
                res.redirect("/user/login?success=User created");
        })
    }
});

module.exports = router;