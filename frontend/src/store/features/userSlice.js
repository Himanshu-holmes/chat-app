import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user : null,
    password : '',
    publicKeyJwk : null,
    token:'',
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setPassword: (state, action) => {
      state.password = action.payload;
    },
    setPublicKeyJwk: (state, action) => {
      state.publicKeyJwk = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setUser,setPassword,setPublicKeyJwk,setToken } = userSlice.actions;

export default userSlice.reducer;
