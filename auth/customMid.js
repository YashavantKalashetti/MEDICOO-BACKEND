const paramMiddleware = (User)=>{
    return async(req, res, next)=>{
        console.log(User);
        const token  = req.cookies.medicoo || req.headers?.authorization?.split(' ')[1]

        if(!token){
            return res.status(401).json({msg: 'You are not Authorized'})
        }

        try {
            const { _id , holder } = await jwt.verify(token, process.env.COOKIE_SIGNATURE)
            
            if(!_id){
                return res.status(401).json({message: "Request is not authorized"})
            }


            // req.user = await model.findOne({_id})

            // if(!req.user){
            //     return res.status(401).json({message: "Request is not authorized"})
            // }

            if(holder === 'Patient'){
                req.user = await Patient.findOne({ _id })
            }
            else if(holder === 'Doctor'){
                req.user = await Doctor.findOne({ _id })
            }
            else if(holder === 'Hospital'){
                req.user = await Hospital.findOne({ _id })
            }else{
                return res.status(401).json({error: 'Request is not authorized'})
            }
            
            next()

        } catch (error) {
            console.log("An unauthorised access is attempted")
            console.log(error.message)
            return res.status(401).json({error: 'Request is not authorized'})
        }
    }
}

module.exports = paramMiddleware