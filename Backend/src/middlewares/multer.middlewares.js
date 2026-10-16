import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")       //callback
    },
    filename: function (req, file, cb) {
     
      cb(null, file.originalname)    //keeping it original name you can change and add unique file name 
    }
  })



export const upload = multer({ storage, }) 