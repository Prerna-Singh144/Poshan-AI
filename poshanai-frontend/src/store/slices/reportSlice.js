import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getReports, uploadReport as uploadReportFile, deleteReport as deleteReportFile } from '../../api/reportApi.js';
import { getApiError } from '../../api/client.js';

export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      return await getReports();
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

export const uploadReport = createAsyncThunk(
  'reports/uploadReport',
  async (fileOrFormData, { rejectWithValue }) => {
    try {
      return await uploadReportFile(fileOrFormData);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

export const deleteReport = createAsyncThunk(
  'reports/deleteReport',
  async (id, { rejectWithValue }) => {
    try {
      return await deleteReportFile(id);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

const reportSlice = createSlice({
  name: 'reports',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    clearReportError(state) {
      state.error = null;
    },
    clearReports(state) {
      state.items = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(uploadReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadReport.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) state.items.unshift(action.payload.report ?? action.payload);
      })
      .addCase(uploadReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(deleteReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (report) => report.id !== action.payload && report._id !== action.payload,
        );
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearReportError, clearReports } = reportSlice.actions;
export default reportSlice.reducer;
