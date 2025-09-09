const multer = require("multer")
// Use memory storage so buffers are available on req.file.buffer
const storage = multer.memoryStorage()

const upload = multer({ 
    storage: storage 
})


module.exports = upload