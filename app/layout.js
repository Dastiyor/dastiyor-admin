
import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "./scss/app.scss";

export const metadata = {
  title: "Dastiyor - Service Marketplace",
  description: "Find skilled professionals for your tasks. The best marketplace for services. Admin panel.",
}

import ThemeProvider from "./theme-provider"
export default function RootLayout({ children }) {
  return (
    <>
      <html lang="en">
        <body className="font-inter custom-tippy dastiyor-app">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
