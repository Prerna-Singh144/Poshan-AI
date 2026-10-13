import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import mealPlanApi from '../../services/mealPlanApi.js';
import { getApiError } from '../../services/api.js';

export const fetchMealPlans = createAsyncThunk(
  'mealPlans/fetchMealPlans',
  async (_, { rejectWithValue }) => {
    try {
      return await mealPlanApi.getMealPlans();
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

export const fetchMealPlanById = createAsyncThunk(
  'mealPlans/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await mealPlanApi.getMealPlan(id);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

export const generateMealPlan = createAsyncThunk(
  'mealPlans/generate',
  async (request, { rejectWithValue }) => {
    try {
      return await mealPlanApi.generateMealPlan(request);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

const mealPlanSlice = createSlice({
  name: 'mealPlans',
  initialState: { items: [], current: null, loading: false, error: null },
  reducers: {
    clearMealPlanError(state) {
      state.error = null;
    },
    clearCurrentMealPlan(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMealPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMealPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(fetchMealPlanById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPlanById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload?.mealPlan ?? action.payload;
      })
      .addCase(fetchMealPlanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(generateMealPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateMealPlan.fulfilled, (state, action) => {
        state.loading = false;
        const plan = action.payload?.mealPlan ?? action.payload;
        state.current = plan;
        if (plan) state.items.unshift(plan);
      })
      .addCase(generateMealPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearMealPlanError, clearCurrentMealPlan } = mealPlanSlice.actions;
export default mealPlanSlice.reducer;
