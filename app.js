var createError = require("http-errors");
var express = require("express");
// const bodyParser = require('body-parser');

var path = require("path");
global.appRoot = path.resolve(__dirname);
global.publicRoot = path.join(__dirname, "public/");

var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
// Route Files
const auth = require('./routes/auth');
const shopifyProducts = require("./routes/shopifyProducts");
const shopifyCustomers = require("./routes/shopifyCustomers");
const shopifyProductions = require("./routes/shopifyProductions");
const shopifyOrders = require("./routes/shopifyOrders");
const leads = require("./routes/leads");
const production_types = require("./routes/production_types");
const shopifyInventory = require("./routes/shopifyInventory");

var cors = require("cors");

var app = express();

app.use(cors());


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");


// app.use(bodyParser.json({ limit: '10mb' }));
// app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb'}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/designs", require("./routes/designs"));
app.use("/shopify", require("./routes/shopify"));
app.use("/style-assist", require("./routes/style-assist"));
app.use("/smart-fit", require("./routes/smart-fit"));
app.use("/products", require("./routes/products"));
app.use("/razorpay", require("./routes/razorpay"));


app.use('/api/v1/auth', auth);
app.use('/api/v1/products', shopifyProducts);
app.use('/api/v1/customers', shopifyCustomers);
app.use('/api/v1/productions', shopifyProductions);
app.use('/api/v1/orders', shopifyOrders);
app.use('/api/v1/inventory', shopifyInventory);
app.use('/api/v1/productionTypes', production_types);
app.use('/api/v1/leads', leads);
app.use('/api/v1/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
