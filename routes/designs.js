var express = require('express');
var router = express.Router();
const {User, Design} = require('../models')
const path = require("path");


/* GET users listing. */
router.post('/upload-image', async function (req, res, next) {
    const d = new Date();
    let time = d.getTime();
    let file = req.files.file;
    let uploadedFileName = `/uploads/${time}-${file.name}`
    let filePath = path.join(__dirname, `../public/${uploadedFileName}`)
    file.mv(filePath, () => {
        res.send({success: 1, file: uploadedFileName})
    })
})
router.post('/upload-images', async function (req, res, next) {
    const d = new Date();
    let uploadedFiles = []
    // console.log(req.files)
    // console.log(req.files['files'])
    let files = req.files['files'];
    if (typeof files != 'array') {
        files = [files]
    }
    for (let file of files) {
        let time = d.getTime();
        let uploadedFileName = `/uploads/${time}-${file.name}`;
        let filePath = path.join(__dirname, `../public/${uploadedFileName}`);
        await file.mv(filePath);
        uploadedFiles.push(uploadedFileName);
    }
    res.send(uploadedFiles)
})
router.get('/', async function (req, res, next) {
    let items = await Design.findAll()
    res.send(items)
})
router.post('/', async function (req, res, next) {
    let params = req.body;
    params.status = 0
    // params.user_id = null
    let design = await Design.create(params)
    res.send(design);
});

module.exports = router;
