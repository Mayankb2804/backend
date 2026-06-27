import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { ApiError } from "./ApiError.js";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, resourceType = "image") => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType,
            quality: "auto:low",        // compress automatically
            fetch_format: "auto",       // best format (webp etc)
            timeout: 60000,             // 60s timeout
        })

        fs.unlinkSync(localFilePath)
        console.log(`[Cloudinary] ✅ Uploaded: ${response.public_id}`)
        return response

    } catch (error) {
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath)
        console.error(`[Cloudinary] ❌ Upload failed: ${error.message}`)
        return null
    }
}

const deleteFromCloudinary = async (publicId, resource_type = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type })
        console.log(`[Cloudinary] ✅ Deleted: ${publicId}`)
        return result
    } catch (error) {
        console.error(`[Cloudinary] ❌ Delete failed: ${error.message}`)
        throw new ApiError(500, "Failed to delete resource from Cloudinary")
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }
