var express = require("express");
var router = express.Router();
const {User, SmartFit, Appointment, StyleAssist, Address} = require("../models");
const bcrypt = require("bcrypt");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
var base64 = require("base-64");
const {protect} = require("../middleware/auth");
const {Op} = require("sequelize");


/* GET users listing. */
router.get("/", protect, async function (req, res, next) {
    let users = await User.findAll({
        where: {
            designation: {
                [Op.ne]: null
            }
        }
    })
    return res.send(users)
});
router.get("/:id", protect, async function (req, res, next) {
    let {id} = req.params
    let user = await User.findOne({
        where: {
            id
        }
    })
    return res.send(user)
});
router.put("/:id", protect, async function (req, res, next) {
    let {id} = req.params
    let user = await User.findOne({
        where: {
            id
        }
    })
    const {email, password} = req.body
    user.email = email
    if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt)
    }
    await user.save()
    return res.send({user, success: 1});
});
router.post("/login", async function (req, res, next) {
    const {email, password, hash} = req.body;
    let user = await User.findOne({where: {email}});
    if (hash && user.password == hash) {
        return res.send({user});
    }
    if (await bcrypt.compare(password, user.password)) {
        return res.send({user});
    }
    return res.send({error: "Invalid User!"});
});
router.post("/", async function (req, res, next) {
    let params = req.body;
    params.status = 0;
    // bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    // });
    let user = await User.create(params);
    res.send(user);
});
router.put("/", async function (req, res, next) {
    let params = req.body;
    // console.log(params);
    let user = await User.findByPk(params.id);
    user.first_name = params.first_name;
    // console.log(params.first_name);
    user.last_name = params.last_name;
    user.date_of_birth = params.date_of_birth;
    user.gender = params.gender;
    user.phone = params.phone;
    user.email = params.email;
    // console.log(user);
    await user.save();
    res.send({success: 1});
});
router.get("/app/create", async function (req, res, next) {
    res.send("Only post supported");
});
router.post("/app/create", async function (req, res, next) {
    let params = req.body;
    let existingUser = await User.findOne({where: {phone: params.phone}});
    if (existingUser) {
        res.send({error: "Phone number already registered!"});
    }
    params.status = 0;
    let user = await User.create(params);
    user.email = user.id + "@hilodesigns.co";
    await user.save();
    res.send(user);
    // res.send(user);
});
router.delete("/:id", protect, async function (req, res, next) {
    let user = await User.findByPk(req.params.id)
    user.destroy()
    return res.send({success: 1})
})
router.post("/add", protect, async function (req, res, next) {
    let params = req.body;

    let user = params.id ? await User.findByPk(params.id) : await User.create({});
    user.set(params)
    if (!user.email) {
        user.email = user.id + "@hilodesigns.co";
    }
    await user.save();
    res.send(user);
});
router.post("/does-phone-exist", async function (req, res, next) {
    let params = req.body;
    let existingUser = await User.findOne({where: {phone: params.phone}});
    res.send({success: existingUser != null});
});
router.post("/get-phone-user", async function (req, res, next) {
    let params = req.body;
    let existingUser = await User.findOne({where: {phone: params.phone}});
    res.send({success: existingUser != null, user: existingUser});
});
router.post("/get-user-by-id", async function (req, res, next) {
    let params = req.body;
    let existingUser = await User.findOne({where: {id: params.user_id}});
    res.send({success: existingUser != null, user: existingUser});
});
router.get("/measurements", async function (req, res, next) {
    let params = req.query;
    // console.log(params);
    let existingUser = await User.findOne({where: {id: params.user_id}});
    res.send({top: existingUser.top_measurements, bottom: existingUser.bottom_measurements});
});
router.get("/smart-fit", async function (req, res, next) {
    let {user_id} = req.query;
    let smartFit = await SmartFit.findOne({where: {user_id}});
    return res.send(smartFit || {});
});
router.get("/style-assist", async function (req, res, next) {
    let {user_id} = req.query;
    let styleAssist = await StyleAssist.findOne({where: {user_id}});
    return res.send(styleAssist || {});
});
router.get("/addresses", async function (req, res, next) {
    let {user_id} = req.query;
    let addresses = await Address.findAll({where: {user_id}});
    return res.send(addresses || []);
});
router.get("/addresses/:id", async function (req, res, next) {
    let {id} = req.params;
    let addresses = await Address.findOne({where: {id}});
    return res.send(addresses || {});
});
router.delete("/addresses/:id", async function (req, res, next) {
    let {id} = req.params;
    let addresses = await Address.findOne({where: {id}});
    await addresses.destroy();
    return res.send({success: 1});
});

router.post("/measurements", async function (req, res, next) {
    let {top, bottom, user_id} = req.body;
    let existingUser = await User.findOne({where: {id: user_id}});
    existingUser.top_measurements = top;
    existingUser.bottom_measurements = bottom;
    await existingUser.save();
    res.send({success: 1});
});
router.post("/addresses", async function (req, res, next) {
    let {pincode, city, state, name, email, address_1, address_2, type, user_id, id} = req.body;
    let address = id ? await Address.findOne({where: {id}}) : new Address;
    address.pincode = pincode;
    address.city = city;
    address.state = state;
    address.name = name;
    address.email = email;
    address.address_1 = address_1;
    address.address_2 = address_2;
    address.type = type;
    address.user_id = user_id;
    await address.save();
    res.send({success: 1});
});

router.post("/create-password", async function (req, res, next) {
    const {email, password, confirmPassword} = req.body;
    let user = await User.findOne({where: {email}});
    const salt = await bcrypt.genSalt(10);
    if (user && password === confirmPassword) {
        user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    res.send({user});
});
router.post("/appointment", async function (req, res, next) {
    const {user_id, location} = req.body;
    let date = moment(req.body.date).toISOString();
    let appointment = await Appointment.create({
        user_id: user_id,
        type: "Physical",
        status: 0,
        location,
        date,
    });
    res.send({success: 1, appointment});
});
router.post("/selfie", async function (req, res, next) {
    const {user_id, img_data} = req.body;
    let user = await User.findOne({where: {id: user_id}});
    // console.log(user);
    let content = Buffer.from(img_data, "base64").toString("utf8");

    // fs.writeFile();
    // console.log(content);
    const d = new Date();
    let time = d.getTime();
    let uploadedFileName = `/uploads/${time}-selfie.jpeg`;
    let filePath = path.join(__dirname, `../public/${uploadedFileName}`);
    // var decodedData = base64.decode(img_data);
    // var text = utf8.decode(bytes);

    fs.writeFileSync(filePath, img_data, {encoding: "base64"});
    user.selfie = uploadedFileName;
    await user.save();
    res.send({success: 1, selfie: uploadedFileName});
});

module.exports = router;
