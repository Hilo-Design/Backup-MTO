const express = require('express');

const {
    fetchProductions, editProduction, getProductionSummery, deleteImage, readProduction
} = require("../controllers/shopifyProductions")

const {protect} = require("../middleware/auth");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const {LineItem} = require("../models");

router.get("/", protect, fetchProductions);

router.get("/show/:id", protect, readProduction);

router.post("/edit/:id", protect, editProduction);

router.get("/getProductionSummery", protect, getProductionSummery);

router.delete("/deleteImage/:id", protect, deleteImage);


var filestorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads"))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
})

var upload = multer({
    storage: filestorageEngine
})
router.post('/uploadImage/:id', upload.array('images'), async (req, res) => {
    const files = req.files;
    let imgs = [];
    for (let file of files) {
        const lineitem = await LineItem.findByPk(req.body.line_item_id); // assuming we want to associate with the user with id 1
        let image = await lineitem.createLine_item_image({
            img: process.env.BASE_PATH + `/uploads/` + file.filename,
        });
        imgs.push(image);
    }
    res.status(200).json({
        success: true,
        data: imgs,
    });
});
router.post('/upload-file', upload.array('files'), async (req, res) => {
    const files = req.files;
    // console.log({files})
    // let files_urls = files[0].path;
    let files_urls = process.env.BASE_PATH + `/uploads/` + files[0].filename;
    res.status(200).json({
        success: true,
        data: files_urls,
    });
});
module.exports = router;
