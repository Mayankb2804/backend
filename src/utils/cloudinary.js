import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath)
            return null
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //console.log("File is Uploadedd on CLoudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    }
    catch(error){   
        fs.unlinkSync(localFilePath) // remove the file from local storage temporary file as upload operation got failed
        return null
    }
}   

export {uploadOnCloudinary}

// cloudinary.v2.uploader
// .upload("dog.mp4", {
//   resource_type: "video", 
//   public_id: "my_dog",
//   overwrite: true, 
//   notification_url: "https://mysite.example.com/notify_endpoint"})
// .then(result=>console.log(result));