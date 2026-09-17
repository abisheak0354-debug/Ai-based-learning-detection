import { Router } from 'express';
import multer from 'multer';
import { datasetController } from '../controllers/dataset.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = /csv|spreadsheet|excel|officedocument/gi.test(file.mimetype) || /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!allowed) return callback(new Error('Only CSV, XLS, and XLSX files are supported.'));
    callback(null, true);
  },
});

router.post('/analyze', upload.single('file'), datasetController.analyze);

export default router;
