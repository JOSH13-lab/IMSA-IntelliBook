const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/covers';
    if (file.fieldname === 'book_file') folder = 'uploads/books';
    if (file.fieldname === 'preview_file') folder = 'uploads/previews';
    ensureDir(path.join(__dirname, '..', folder));
    cb(null, path.join(__dirname, '..', folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|webp|svg/;
  const isImage = imageTypes.test(file.mimetype) || imageTypes.test(path.extname(file.originalname).toLowerCase());
  const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';

  if (file.fieldname === 'cover' && isImage) return cb(null, true);
  if ((file.fieldname === 'book_file' || file.fieldname === 'preview_file') && isPdf) return cb(null, true);

  cb(new Error('Format de fichier non supporté pour ce champ.'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 15 * 1024 * 1024
  }
});
