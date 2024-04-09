const {insert,list,loginUser, update,remove} = require("../services/Users")
const httpStatus = require('http-status');
const {passwordHash,generateAccessToken,generateRefreshToken} = require("../scripts/utils/helper");
const Service = require('../services/Projects');
const uuid = require('uuid');
const eventEmitter = require('../scripts/events/eventEmitter');
const path = require('path');
const fs = require('fs');
const ProjectService = new Service();
const create =  (req, res) => {
    req.body.password =  passwordHash(req.body.password);
    insert(req.body).then(response => {
        res.status(httpStatus.OK).send(response);
     }).catch(err => {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
     });
};
const index =  (req, res) => {
    list().then(response => {
        res.status(httpStatus.OK).send(response);
     }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });

}
const login = (req,res) => {
    req.body.password =  passwordHash(req.body.password);
    loginUser(req.body).then(user => {
        if (!user) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
        user = {
            ...user?.toObject(),
            tokens: {
                access_token: generateAccessToken(user),
                refresh_token: generateRefreshToken(user)
            }
        }
        delete user.password;
        res.status(httpStatus.OK).send(user);
    }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const getProjects = async (req,res) => {
    return ProjectService.list({user_id: req.user?._doc?._id}).then(response => {
        res.status(httpStatus.OK).send(response);
    }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const resetPassword = async (req,res) => {
    eventEmitter.emit('send_email', req.body.email);
    const {email} = req.body;
    const newPassword = uuid.v4()?.split("-")[0] || `usr-${new Date().getTime()}`;
    update({email}, {password: passwordHash(newPassword)}).then((response) => {
        if (!response) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
        // send email
        eventEmitter.emit('send_email', {
            to: response?.email, // list of receivers
            subject: "Şifre sıfırlama", // Subject line
            html: `Talebiniz üzere şifre sıfırlama işleminiz gerçekleşmiştir. 
            </br> Giriş yaptıktan sonra şifrenizi değiştiriniz. Yeni şifreniz: ${newPassword}`, // html body
        });
        // send response
        res.status(httpStatus.OK).send({message: "Şifre sıfırlama işlemi başarılı. Yeni şifreniz mail adresinize gönderilmiştir."});
    }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const updateUser = async (req,res) => {
    update({_id: req.user?._doc?._id}, req.body).then(response => {
        if (!response) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
        res.status(httpStatus.OK).send(response);
    }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const deleteUser = async (req,res) => {
     if (req.user?._doc?._id === req.params.id) return res.status(httpStatus.FORBIDDEN).send({message: "You can't delete yourself"})
    remove({_id: req.params?.id}).then(response => {
         if (!response) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
         res.status(httpStatus.OK).send({message: "User deleted"});
    }).catch(err => {
         res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const changePassword = async (req,res) => {
    req.body.password =  passwordHash(req.body.new_password);
    //check old password is correct
    const user = await loginUser({_id: req.user?._doc?._id, password: passwordHash(req.body.old_password)});
    if (!user) return res.status(httpStatus.UNAUTHORIZED).send({message: "Old password is incorrect"});
    update({_id: req.user?._doc?._id}, req.body).then(response => {
        if (!response) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
       const userData = {
            ...user?.toObject(),
            tokens: {
                access_token: generateAccessToken(user),
                refresh_token: generateRefreshToken(user)
            }
        }
        delete userData.password;
        res.status(httpStatus.OK).send(userData);
    }).catch(err => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    });
}
const updateProfileImage = async (req,res) => {
    // check file exist in request
    if (!req?.files?.profile_image) return res.status(httpStatus.BAD_REQUEST).send({message: "Profile image is required"});
    // check file type
    const extension = path.extname(req.files.profile_image.name);
    const fileName = `${req.user?._doc?._id}${extension}`;
    const filePath = path.join(__dirname, '../' ,"uploads/users", fileName);
    const checkFolderPath = path.join(__dirname, '../' ,"uploads/users");
    // check folder exist
    if (!fs.existsSync(checkFolderPath)) fs.mkdirSync(checkFolderPath, { recursive: true });

    //check file names are same if same delete old file if not move new file
    if (req.user?._doc?.profile_image && req.user?._doc?.profile_image !== '/uploads/users/'+fileName) {
        const oldFilePath = path.join(__dirname, '../' ,req.user?._doc?.profile_image);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
    }
    // move file to folder
    await req.files.profile_image.mv(filePath, function (err) {
        if (err) return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
           update({_id: req.user?._doc?._id}, { profile_image: '/uploads/users/'+fileName }).then(response => {
               if (!response) return res.status(httpStatus.NOT_FOUND).send({message: "User not found"});
               res.status(httpStatus.OK).send(response);
           }).catch(err => {
               res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
           });
     })

}
module.exports = {
    create,
    index,
    login,
    getProjects,
    resetPassword,
    updateUser,
    deleteUser,
    changePassword,
    updateProfileImage
}
