import React, { createContext } from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import "./i18n";
import * as serviceWorker from "./serviceWorker";
import ErrorBoundary from "./components/ErrorBoundary";

export const StripeContext = createContext({ stripePublishableKey: null });

document.addEventListener("DOMContentLoaded", async () => {
  const { stripePublishableKey } = await fetch(
    "http://localhost:4242/config"
  ).then((r) => r.json());

  ReactDOM.render(
    <ErrorBoundary>
      {" "}
      <StripeContext.Provider value={{ stripePublishableKey }}>
        <App />
      </StripeContext.Provider>
    </ErrorBoundary>,
    document.getElementById("root")
  );
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
