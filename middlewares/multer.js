import multer from "multer";

const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

// MulterUpload is a Middleware .singl use for accesing single file from the field called as avatar
const singleAvatar = multerUpload.single("avatar");
const attachementsMulter = multerUpload.array("files", 5);

//exporting singleavatar instead of multerupload
export { singleAvatar, attachementsMulter };
