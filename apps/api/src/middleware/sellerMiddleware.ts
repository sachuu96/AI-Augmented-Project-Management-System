import { Request, Response, NextFunction } from "express";

export const sellerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sellerId = req.header("X-Seller-Id");
  if (!sellerId) {
    return res.status(400).json({ error: "X-Seller-Id header is required" });
  }
  // Attach sellerId to request object for later use
  (req as any).sellerId = sellerId;
  next();
};
