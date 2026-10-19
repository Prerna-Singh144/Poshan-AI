import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice.js';
import reportReducer from './slices/reportSlice.js';
import mealPlanReducer from './slices/mealPlanSlice.js';
import foodLogReducer from './slices/foodLogSlice.js';

export const store = configureStore({
  reducer: {
    user: userReducer,
    reports: reportReducer,
    mealPlans: mealPlanReducer,
    foodLog: foodLogReducer,
  },
});

export default store;
