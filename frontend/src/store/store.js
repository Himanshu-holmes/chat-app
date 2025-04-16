import { configureStore } from "@reduxjs/toolkit";
import  userReducer from "./features/userSlice";
import userInteractionReducer from "./features/interactionSlice";

export const store = configureStore({
  reducer: {
    user:userReducer,
    userInteraction:userInteractionReducer
  },
});
