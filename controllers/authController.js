const db= require('../models');
const User = db.User;



exports.registerUser = async (req, res) => {
    try{
        let {first_name, last_name, email, password,age,user_photo_url,agreedToTerms} = req.body;
        //Validation
        const existingUser= await User.findOne({where : { email : email}})
        if(existingUser){
            return res.status(400).send({error: 'User already exists'});
        }
        if(!agreedToTerms){
            return res.status(400).send({error: 'You must agree to the Terms of Service'});
        }

        const createField ={
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: password,
            age: age,

        };
        if (user_photo_url){
            createField.user_photo_url = user_photo_url;
        }
        await User.create(createField);
        return res.status(201).send({message:"User successfully registered"});

    }catch(err){
        if (err.name === 'SequelizeValidationError') {
            const errors = err.errors.map((err) => err.message);
            return res.status(400).send({errors: errors});
        }
        console.error(err);
        return res.status(500).send({error: 'Something went wrong'});

    }



}
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
exports.loginUser = async (req, res) => {
    try{
        const {email, password} = req.body;
        const user= await User.findOne({where : {email:email}});
        if(!user){
            return res.status(401).send({error: 'Invalid email or password'});
        }
        if (user.isBanned){
            return res.status(403).send({error: 'This account has been suspended'});
        }
        const matchPassword= await bcrypt.compare(password, user.password);
        if(!matchPassword){
            return res.status(401).send({error: 'Invalid email or password'});
        }
        const payload= {
            user:{
                user_id:user.id,
                role:user.role,
            }
        }
        jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
            if(err){
                throw err;
            }
            res.status(200).json({token:token});
        })
    }catch(err){
        console.error(err);
        res.status(500).send({error: 'Something went wrong'});
    }
}
exports.logoutUser = async (req, res) => {
    res.status(200).send({message:"User logged out"});
}