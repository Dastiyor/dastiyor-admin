"use client";
import store from "../store";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { LanguageProvider } from "@/context/LanguageContext";

const ThemeProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <LanguageProvider>{children}</LanguageProvider>
      {/* ponytail: one container at the root — auth pages had none, so login errors were silently dropped */}
      <ToastContainer />
    </Provider>
  );
};

export default ThemeProvider;
