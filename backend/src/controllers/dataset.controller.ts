import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { datasetService } from '../services/dataset.service';

export const datasetController = {
  analyze: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json(ApiResponse.fail('Upload a CSV or Excel file.'));
    const summary = datasetService.analyze(req.file.buffer, req.file.originalname);
    const result = await datasetService.train(summary);
    return res.json(ApiResponse.ok(result, 'Dataset analyzed and model trained'));
  }),
};
