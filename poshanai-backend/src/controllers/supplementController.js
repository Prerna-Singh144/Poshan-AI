import asyncHandler from '../utils/asyncHandler.js';
import { getSupplementList } from '../services/supplementCatalogService.js';

export const list = asyncHandler(async (_req, res) => res.json({
  success: true,
  data: {
    supplements: getSupplementList(),
    dosageNote: 'Default dosages are editable catalog examples, not personalized recommendations. Follow the product label and qualified professional guidance.',
  },
}));

export default { list };
