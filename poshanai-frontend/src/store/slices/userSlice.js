import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfile, updateProfile as updateUserProfile } from '../../api/userApi.js';
import { getApiError } from '../../api/client.js';

export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await getProfile();
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (profile, { rejectWithValue }) => {
    try {
      return await updateUserProfile(profile);
    } catch (error) {
      return rejectWithValue(getApiError(error));
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null, previousProfile: null, loading: false, error: null },
  reducers: {
    clearUserError(state) {
      state.error = null;
    },
    clearProfile(state) {
      state.profile = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload?.user ?? action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(updateProfile.pending, (state, action) => {
        state.previousProfile = state.profile;
        state.loading = true;
        state.error = null;
        const update = action.meta.arg;
        state.profile = {
          ...(state.profile ?? {}),
          ...(update.name ? { name: update.name } : {}),
          ...(update.profile ? { profile: { ...(state.profile?.profile ?? {}), ...update.profile } } : {}),
        };
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload?.user ?? action.payload;
        state.previousProfile = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.profile = state.previousProfile;
        state.previousProfile = null;
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearUserError, clearProfile } = userSlice.actions;
export default userSlice.reducer;
