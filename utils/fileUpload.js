const multer = require('multer');
const path = require('path');

// Configure multer for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profileImage') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'idProof') {
      uploadPath += 'documents/';
    } else if (file.fieldname === 'video') {
      uploadPath += 'videos/';
    } else if (file.fieldname === 'images') {
      uploadPath += 'images/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    profileImage: ['image/jpeg', 'image/png', 'image/webp'],
    idProof: ['image/jpeg', 'image/png', 'application/pdf'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    images: ['image/jpeg', 'image/png', 'image/webp']
  };

  const fieldAllowedTypes = allowedTypes[file.fieldname] || [];
  
  if (fieldAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${fieldAllowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, 
    files: 10 
  }
});

// Upload configurations for different scenarios
const uploadConfigs = {
  profileImage: upload.single('profileImage'),
  
  idProof: upload.single('idProof'),
  
  video: upload.single('video'),
  
  images: upload.array('images', 5),
  
  // Mixed files for help requests
  helpRequestFiles: upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'images', maxCount: 3 }
  ]),
  
  // Mixed files for stories
  storyFiles: upload.fields([
    { name: 'beforeImages', maxCount: 3 },
    { name: 'afterImages', maxCount: 3 },
    { name: 'videos', maxCount: 2 }
  ]),
  
  // Partner organization files
  partnerFiles: upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'registrationDocument', maxCount: 1 }
  ])
};

const uploadToCloud = async (file) => {
  return {
    url: `https://example.com/uploads/${file.filename}`,
    publicId: file.filename
  };
};

const deleteFromCloud = async (publicId) => {
  console.log(`Deleting file with publicId: ${publicId}`);
};

// File validation helpers
const validateFileSize = (size, maxSize) => {
  return size <= maxSize;
};

const validateFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

const resizeImage = async (inputPath, outputPath, width, height) => {
  console.log(`Resizing image from ${inputPath} to ${outputPath}`);
};

const generateThumbnail = async (videoPath, outputPath) => {
  console.log(`Generating thumbnail for video: ${videoPath}`);
};

module.exports = {
  upload,
  uploadConfigs,
  uploadToCloud,
  deleteFromCloud,
  validateFileSize,
  validateFileType,
  resizeImage,
  generateThumbnail
};