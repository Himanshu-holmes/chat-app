export const getAxiosErrorMessage = (error, onCallback, onError) => {
  let message;
  if (error.response?.data?.message) {
    message = error.response.data.message;
    typeof onCallback === "function" && onCallback(message);
  } else if (error.response?.data?.error) {
    message = error.response.data.error;
    typeof onError === "function" && onError(message);
  } else if (error.message) {
    message = error.message;
    typeof onError === "function" && onError(message);
  } else {
    message = "An unexpected error occurred";
    typeof onError === "function" && onError(message);
    console.error(error);
  }
  return message;
};
