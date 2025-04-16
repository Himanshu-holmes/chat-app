import { createSlice } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { cryptoService } from "../../services/cryptoService";
import socketService from "../../services/socketService";
import apiService from "../../services/axiosService";

export const selectUser = createAsyncThunk(
  "userInteraction/selectUser",
  async (
    { user, currentUser, currentUserPbkJwk },
    { getState, rejectWithValue }
  ) => {
    console.log("symmetric key :::::::::::", cryptoService.symmetricKeys[user.id]);
    if (!user || !user.id) return rejectWithValue("Invalid user");

    try {
      // Check if we need to establish a symmetric key for this user
      if (!cryptoService.symmetricKeys[user.id]) {
        try {
          // Try to fetch existing symmetric key from server
          const keyResponse = await apiService.get("/message/sm-key", {
            withCredentials: true,
            params: {
              senderId: currentUser.id,
              recipientId: user.id,
            },
          });

          console.log("keyResponse", keyResponse);
        } catch (error) {
          console.error("Error fetching symmetric key:", error);
          // If key doesn't exist, generate a new one
          if (error?.response?.data?.message?.toLowerCase() === "gen") {
            // Get users from state
            const { users } = getState().userInteraction;
            // Generate new symmetric key
            const symmetricKey = await cryptoService.createSymmetricKey(
              user.username
            );
            // Find recipient user data
            const recipient = users.find((item) => item.id === user.id);
            if (!recipient) {
              throw new Error(`User with ID ${user.id} not found`);
            }
            const recipientPublicKey = recipient.pubk_jwk;
            // Encrypt symmetric key for both users
            const encryptedKeyForRecipient =
              await cryptoService.encryptSymmetricKey(
                symmetricKey,
                recipientPublicKey
              );

            const encryptedKeyForCurrentUser =
              await cryptoService.encryptSymmetricKey(
                symmetricKey,
                currentUserPbkJwk
              );

            // Store keys on server
            await Promise.all([
              apiService.post("/message/sm-key", {
                recipient: user.id,
                sender: currentUser.id,
                smKey: encryptedKeyForRecipient,
              }),

              apiService.post("/message/sm-key", {
                recipient: currentUser.id,
                sender: user.id,
                smKey: encryptedKeyForCurrentUser,
              }),
            ]);
          } else {
            console.error("Error fetching symmetric key:", error);
            throw error; // Re-throw if it's a different error
          }
        }
      }

      // Get user online status
      socketService.getUserStatus(user.id);

      // Fetch messages for this user
      const response = await apiService.get("/message/getMessages", {
        withCredentials: true,
        params: { user: user.id },
      });

      const messages = response?.data?.data || [];
      let decryptedMessages = [];

      if (messages.length > 0) {
        const senderData = {
          username:
            messages[0].senderUsername === currentUser.username
              ? user.username
              : messages[0].senderUsername,
          id:
            String(messages[0].senderId) === String(currentUser.id)
              ? messages[0].receiverId
              : messages[0].senderId,
        };

        // Decrypt messages
        decryptedMessages = await Promise.all(
          messages.map(async (message) => {
            try {
              const decryptedMessage = await cryptoService.decryptMessage(
                message.message,
                senderData,
                currentUser
              );
              return { ...message, message: decryptedMessage };
            } catch (err) {
              console.error("Error decrypting message:", err);
              return { ...message, message: "⚠️ Unable to decrypt message" };
            }
          })
        );
      }

      return { user, messages: decryptedMessages };
    } catch (error) {
      console.error("Error selecting user:", error);
      return rejectWithValue("Failed to start conversation with this user");
    }
  }
);

const initialState = {
  users: [],
  selectedUser: null,
  messages: {},
  newMessage: "",
  searchUser: null,
  showNotification: [],
  status: [],
  isLoading: false,
  error: null,
};

export const userInteractionSlice = createSlice({
  name: "userInteraction",
  initialState,
  reducers: {
    addUsers: (state, action) => {
      const prevUsers = state.users;
      const newUsers = action.payload;
      const isExistingUser = prevUsers.some(
        (user) => user.id === newUsers.id
      );
      if (!isExistingUser) {
        state.users = [...prevUsers,newUsers];
      }
    },
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    addNotification: (state, action) => {
      const userId = action.payload;
      if (!state.showNotification.includes(userId)) {
        state.showNotification.push(userId);
      }
    },
    clearNotification: (state, action) => {
      const userId = action.payload;
      state.showNotification = state.showNotification.filter(
        (id) => id !== userId
      );
    },
    setStatus: (state, action) => {
      const prev = state.status;
      const newStatus = action.payload;
      const updatedStatus = prev.filter((status) => status !== newStatus);
      updatedStatus.push(newStatus);
      state.status = updatedStatus;
    },
    setMessages: (state, action) => {
      const { id, messages } = action.payload;
      console.log("setMessages", id, messages);
      const conversationKey = id;
      if (!state.messages[conversationKey]) {
        state.messages[conversationKey] = [];
      }

      state.messages[conversationKey] = [
        ...state.messages[conversationKey],
        messages,
      ];
    },
    setNewMessage: (state, action) => {
        const message = action.payload;
        state.newMessage = message;
    },
    setSelectedUser: (state, action) => {
      const user = action.payload;
      console.log("setSelectedUser", user);
      state.selectedUser = user;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(selectUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(selectUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selectedUser = action.payload.user;
        state.messages[action.payload.user.id] = action.payload.messages;
        state.showNotification = state.showNotification.filter(
          (id) => id !== action.payload.user.id
        );
      })
      .addCase(selectUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to select user";
      });
  },
});

// Action creators are generated for each case reducer function
export const {
  addNotification,
  addUsers,
  clearNotification,
  setUsers,
  setError,
  setIsLoading,
  setStatus,
  setMessages,
  setNewMessage,
  setSelectedUser
} = userInteractionSlice.actions;

export default userInteractionSlice.reducer;
