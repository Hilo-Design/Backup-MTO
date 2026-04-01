var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/test', function (req, res, next) {
  res.json({msg: 'This is CORS-enabled for only example.com.'})
})

module.exports = router;
