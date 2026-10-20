import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { getApiError } from '../../api/client.js';
import { addFood, getTodayLog } from '../../api/foodLogApi.js';
import { getPortionNutrients, getServingGrams, sumNutrients } from '../../utils/nutrition.js';

export const fetchTodayLog = createAsyncThunk(
  'foodLog/fetchToday',
  async (date, { rejectWithValue }) => {
    try {
      return await getTodayLog(date);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

/**
 * Optimistic add. `pending` appends a provisional entry (values computed locally from the IFCT
 * per-100 g data), `fulfilled` swaps it for the server's entry, `rejected` rolls it back.
 * Provisional entries are matched by the thunk's requestId, so several adds can be in flight.
 */
export const addFoodEntry = createAsyncThunk(
  'foodLog/addFood',
  async ({ food, quantity, measure, date }, { rejectWithValue }) => {
    try {
      const { entry } = await addFood({ ifctCode: food.ifctCode, quantity, measure, date });
      return entry;
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

const foodLogSlice = createSlice({
  name: 'foodLog',
  initialState: { date: null, entries: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayLog.pending, (state) => {
        if (state.status !== 'ready') state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTodayLog.fulfilled, (state, action) => {
        state.date = action.payload.date;
        // Keep in-flight optimistic entries that the server does not know about yet.
        state.entries = [...action.payload.entries, ...state.entries.filter((entry) => entry.pending)];
        state.status = 'ready';
      })
      .addCase(fetchTodayLog.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? action.error.message;
      })
      .addCase(addFoodEntry.pending, (state, action) => {
        const { food, quantity, measure, date } = action.meta.arg;
        const grams = getServingGrams(food, measure, quantity);
        state.entries.push({
          id: `pending-${action.meta.requestId}`,
          requestId: action.meta.requestId,
          pending: true,
          date,
          ifctCode: food.ifctCode,
          foodName: food.foodName,
          grams,
          quantity,
          measure,
          ...getPortionNutrients(food, grams),
        });
      })
      .addCase(addFoodEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex((entry) => entry.requestId === action.meta.requestId);
        if (index === -1) state.entries.push(action.payload);
        else state.entries[index] = action.payload;
      })
      .addCase(addFoodEntry.rejected, (state, action) => {
        state.entries = state.entries.filter((entry) => entry.requestId !== action.meta.requestId);
      });
  },
});

export const selectFoodLog = (state) => state.foodLog;
export const selectTotals = createSelector([(state) => state.foodLog.entries], sumNutrients);

export default foodLogSlice.reducer;
