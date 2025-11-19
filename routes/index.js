const express=require('express');
const router=express.Router();

// Temporary as there was no api.js file and deployment was crashing
router.get('/',(req,res)=>{
    res.send("Backend is running");
});

module.exports = router;