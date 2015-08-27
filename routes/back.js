var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  req.AM.secureResponse(req, res, '/user/login', 'back/index', {}, true)
});

module.exports = router;