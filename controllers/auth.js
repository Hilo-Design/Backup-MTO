const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {User} = require("../models");

const users = [
    {
        id: 1,
        role: 'admin',
        password: 'zfmmBtNtuHyv',
        fullName: 'John Doe',
        username: 'johndoe',
        email: 'operations@hilodesign.co'
    },
    {
        id: 2,
        role: 'client',
        password: 'client',
        fullName: 'Jane Doe',
        username: 'janedoe',
        email: 'client@vuexy.com'
    }
]

//==================================== Login User Route =========================//
// @route       POST api/auth
// @desc        Login User And get token
// @access      Public
exports.login = async (req, res) => {
    const {email, password} = req.body

    let error = {
        email: ['Something went wrong']
    }
    let user = await User.findOne({where: {email}})
    if (await bcrypt.compare(password, user.password)) {
        user.role = 'admin'
    } else {
        user = users.find(u => u.email === email && u.password === password);
    }

    if (user) {
        const accessToken = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRE})

        const response = {
            accessToken,
            userData: {...user, password: undefined}
        }
        res.status(200).send(response);
    } else {
        error = {
            email: ['email or Password is Invalid']
        }
        res.status(400).send({error});
    }


    // Pulling things out of req.body
    /*const salt = await bcrypt.genSalt(10);
    const FixedPassword = await bcrypt.hash("hilooperations@12%", salt);
    const { email, password } = req.body;
    try {
        // See if user exist
        // Checking hardcoded email and password
        if(email !== FixedEmail){
            return res
            .status(400)
            .json({ errors: [{ msg: "Email Not in Database" }] });
        }


        const isMatch = await bcrypt.compare(password, FixedPassword);

        if (!isMatch) {
            return res
            .status(400)
            .json({ errors: [{ msg: "Invalid Credentials" }] });
        }

        return jsonwebtoken

        const payload = {
            user: {
            id: UserID,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1000y' },
            (err, token) => {
            if (err) {
                throw err;
            }
            res
                .status(200)
                .json({
                    success:true,
                    token
                });
            }
        );
        } catch (err) {
        console.log(err.message);
        res.status(500).send("Server Error");
        }*/
}


//     // Get token from model and create cookie and send response
// const sendTokenResponse = (user, statusCode, res) =>{

//     // Create Token
//     const token = jwt.sign({ id : this._id}, process.env.JWT_SECRET, {
//         expiresIn : process.env.JWT_EXPIRE
//     });

//     const options = {
//         expires : new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60*60 *1000),
//         httpOnly : true
//     };

//     // https in production
//     if(process.env.NODE_ENV === 'productions'){
//         options.secure = true;
//     }

//     res
//         .status(statusCode)
//         .cookie('token', token, options)
//         .json({
//             success:true,
//             token
//         });
// }