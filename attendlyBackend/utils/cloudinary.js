const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

async function uploadImageBuffer(buffer, filename = 'image.jpg', folder = 'attendly/faces'){
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, public_id: undefined, resource_type: 'image' }, (error, result) => {
      if (error) return reject(error)
      resolve(result)
    })
    stream.end(buffer)
  })
}

module.exports = { cloudinary, uploadImageBuffer }


