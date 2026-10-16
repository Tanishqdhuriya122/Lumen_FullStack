import { asyncHandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { categoryService } from "../services/categoryService.js";

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, thumbnail, parentCategory } = req.body;

  const category = await categoryService.createCategory({
    name,
    description,
    thumbnail,
    parentCategory,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

export const getAllCategories = asyncHandler(async (req, res) => {
  const { includeInactive } = req.query;

  const categories = await categoryService.getAllCategories({
    includeInactive: includeInactive === "true",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories retrieved successfully"));
});

export const getCategoryWithVideos = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { page, limit, sortBy } = req.query;

  const result = await categoryService.getCategoryWithVideos(slug, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sortBy,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Category data retrieved successfully"));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const updates = req.body;

  const category = await categoryService.updateCategory(categoryId, updates);

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  await categoryService.deleteCategory(categoryId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Category deleted successfully"));
});

export const getPopularTags = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const tags = await categoryService.getPopularTags(parseInt(limit) || 50);

  return res
    .status(200)
    .json(new ApiResponse(200, tags, "Popular tags retrieved successfully"));
});

export const getTrendingTags = asyncHandler(async (req, res) => {
  const { limit, days } = req.query;

  const tags = await categoryService.getTrendingTags(
    parseInt(limit) || 30,
    parseInt(days) || 7
  );

  return res
    .status(200)
    .json(new ApiResponse(200, tags, "Trending tags retrieved successfully"));
});

export const getVideosByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const { page, limit } = req.query;

  const result = await categoryService.getVideosByTag(tag, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos retrieved successfully"));
});
