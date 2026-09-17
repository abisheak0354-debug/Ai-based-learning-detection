import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json(ApiResponse.created(data, 'User registered'));
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body.email, req.body.password);
    res.json(ApiResponse.ok(data, 'Login successful'));
  }),
};