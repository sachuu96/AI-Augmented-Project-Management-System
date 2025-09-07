import { FromSchema } from "json-schema-to-ts";

import { ProductCreatedSchema } from "./ProductCreated";
import { ProductDeletedSchema } from './ProductDeleted';
import { ProductUpdatedSchema } from './ProductUpdated';
import { LawStockWarningSchema } from './LowStockWarning';

export type ProductCreated = FromSchema<typeof ProductCreatedSchema>;
export type ProductDeleted = FromSchema<typeof ProductDeletedSchema>;
export type ProductUpdated = FromSchema<typeof ProductUpdatedSchema>;
export type LawStockWarning = FromSchema<typeof LawStockWarningSchema>;

export const PRODUCT_CREATED = "ProductCreated";
export const PRODUCT_DELETED = "ProductDeleted";
export const PRODUCT_UPDATED = "ProductUpdated";
export const LOW_STOCK_WARNING = "LowStockWarning";