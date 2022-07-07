import React from "react";
import SingupComplete from "./SingupComplete";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

//Registration Form Component, process user info for online session.
//const textSingup = ;
const RegistrationForm = ({ session, details }) => {
  const elements = useElements();
  const stripe = useStripe();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState(null);

  const isActive = !!intent;
  const last4 = intent?.payment_method?.card?.last4;
  const customerId = intent?.payment_method?.customer;
  // console.log({ isActive, last4, customerId, intent });

  const handleSubmit = async () => {
    setIsLoading(true);
    const card = elements.getElement(CardElement);

    // create customer if none exist
    // create basic setup intent
    fetch("http://localhost:4242/lessons", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        session,
      }),
    })
      .then((res) => res.json())
      .then(async (json) => {
        const { setupIntent } = json;
        const { client_secret: clientSecret } = setupIntent;

        // Add card to intent
        const { setupIntent: updatedSetupIntent, error } =
          await stripe.confirmCardSetup(clientSecret, {
            return_url: "http://localhost:3000/lessons",
            payment_method: {
              card,
              billing_details: {
                name,
                email,
              },
            },
            expand: ["payment_method"], // Can't query for 'payment_method.customer' here req server key
          });

        // TODO: Error confirming card https://stripe.com/docs/api/errors
        if (error) {
          console.error(error);
        }

        console.log({ updatedSetupIntent });
        setIsLoading(false);
        setIntent(updatedSetupIntent);
      })
      .catch((e) => console.error({ e }));
  };

  return !isActive ? (
    <div className={`lesson-form`}>
      <div className={`lesson-desc`}>
        <h3>Registration details</h3>
        <div id="summary-table" className="lesson-info">
          {details}
        </div>
        <div className="lesson-grid">
          <div className="lesson-inputs">
            <div className="lesson-input-box first">
              <input
                type="text"
                id="name"
                placeholder="Name"
                autoComplete="cardholder"
                className="sr-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="lesson-input-box middle">
              <input
                type="text"
                id="email"
                placeholder="Email"
                autoComplete="cardholder"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="lesson-input-box last">
              <div className="lesson-card-element">
                <CardElement />
              </div>
            </div>
          </div>
          <div className="sr-field-error" id="card-errors" role="alert"></div>
          <div
            className="sr-field-error"
            id="customer-exists-error"
            role="alert"
            hidden
          >
            A customer with the email address of{" "}
            <span id="error_msg_customer_email"></span> already exists. If you'd
            like to update the card on file, please visit
            <span id="account_link"></span>.
          </div>
        </div>
        <button id="submit" onClick={handleSubmit} disabled={isLoading}>
          <div className="spinner hidden" id="spinner"></div>
          <span id="button-text">Request Lesson</span>
        </button>
        <div className="lesson-legal-info">
          Your card will not be charged. By registering, you hold a session slot
          which we will confirm within 24 hrs.
        </div>
      </div>
    </div>
  ) : (
    <div className={`lesson-form`}>
      <SingupComplete
        active={isActive}
        email={email}
        last4={last4}
        customerId={customerId}
      />
    </div>
  );
};

export default RegistrationForm;
