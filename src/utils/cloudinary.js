import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { ApiError } from "./ApiError.js";

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

const deleteFromCloudinary = async (publicId, resource_type = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(
            publicId,
            {
                resource_type
            }
        );
        console.log(result);
        return result;
    } catch (error) {
        console.log(error);
        throw new ApiError(
            500,
            "Failed to delete resource from Cloudinary"
        );
    }
};

export {uploadOnCloudinary, deleteFromCloudinary}

// cloudinary.v2.uploader
// .upload("dog.mp4", {
//   resource_type: "video", 
//   public_id: "my_dog",
//   overwrite: true, 
//   notification_url: "https://mysite.example.com/notify_endpoint"})
// .then(result=>console.log(result));