import React, { useState } from "react";
import { Link } from "@reach/router";
import { useEffect } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

const UpdateCustomer = ({ customer, setCustomer, setPaymentMethods }) => {
  const elements = useElements();
  const stripe = useStripe();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const alreadyExists = error?.type === "CUSTOMER_EXISTS";
  console.log({ alreadyExists, error });

  const cardErrors = [
    "validation_error",
    "card_error",
    "invalid_request_error",
  ];
  const cardInvalid = cardErrors.includes(error?.type);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email);
    }
  }, [customer]);

  elements &&
    elements.getElement(CardElement) &&
    elements.getElement(CardElement).on("change", (e) => {
      const { complete } = e;
      setCardComplete(complete);
    });

  // removed 'cardComplete' -- test allows for email update with out card entry
  const isValid = !!(email && name);

  const handleSuccess = (updatedCustomer, updatedSetupIntent) => {
    setCustomer(updatedCustomer);
    setPaymentMethods([updatedSetupIntent?.payment_method]);
    setIsLoading(false);
    setSuccess(true);
  };

  const handleError = (error) => {
    console.log({ error });
    setIsLoading(false);
    setError(error);
  };

  const confirmCardSetup = async (clientSecret, updatedCustomer) => {
    const card = elements.getElement(CardElement);
    // Add card to intent
    const { setupIntent: updatedSetupIntent, error } =
      await stripe.confirmCardSetup(clientSecret, {
        return_url: `http://localhost:3000/account-update/${customer.id}`,
        payment_method: {
          card,
          billing_details: {
            name,
            email,
          },
        },
        expand: ["payment_method"], // Can't query for 'payment_method.customer' here req server key
      });

    if (error) {
      return handleError(error);
    } else {
      setIntent(updatedSetupIntent);
      return handleSuccess(updatedCustomer, updatedSetupIntent);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    // Customer was updated but card declined.
    if (intent?.status === "requires_payment_method") {
      return confirmCardSetup(intent.client_secret, customer);
    }

    const updatedEmail = customer.email !== email;
    const updatedName = customer.name !== name;

    // create basic setup intent
    fetch(`http://localhost:4242/account-update/${customer.id}`, {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: customer.id,
        name: updatedName ? name : undefined,
        email: updatedEmail ? email : undefined,
      }),
    })
      .then((res) => res.json())
      .then(async (json) => {
        const { setupIntent, error: setupIntentError } = json;
        // Save state secret/state regardless of error for form reuse
        setIntent(setupIntent);

        if (setupIntentError) {
          // Customer exists and SetupIntent Errors
          return handleError(setupIntentError);
        }
        const { customer: updatedCustomer } = setupIntent;
        return confirmCardSetup(setupIntent.client_secret, updatedCustomer);
      })
      .catch((e) => {
        console.error({ e });
        handleError(e);
      });
  };

  return !success ? (
    <div className="lesson-form">
      <div className="lesson-desc">
        <h3>Update your Payment details</h3>
        <div className="lesson-info">
          Fill out the form below if you'd like to us to use a new card.
        </div>
        <div className="lesson-grid">
          <div className="lesson-inputs">
            <div className="lesson-input-box">
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
            <div className="lesson-input-box">
              <input
                type="text"
                id="email"
                placeholder="Email"
                autoComplete="cardholder"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="lesson-input-box">
              <div className="lesson-card-element">
                <CardElement />
              </div>
            </div>
          </div>
          <div className="sr-field-error" id="card-errors" role="alert">
            {cardInvalid ? error.message : null}
          </div>
          {alreadyExists ? (
            <div
              className="sr-field-error"
              id="customer-exists-error"
              role="alert"
            >
              Customer email already exists
            </div>
          ) : null}
        </div>
        <button id="submit" disabled={!isValid} onClick={handleSubmit}>
          {isLoading ? (
            <div className="spinner" id="spinner"></div>
          ) : (
            <span id="button-text">Register</span>
          )}
        </button>
        <div className="lesson-legal-info">
          Your card will not be charged. By registering, you hold a session slot
          which we will confirm within 24 hrs.
        </div>
      </div>
    </div>
  ) : (
    <div className="lesson-form">
      <div className="sr-section completed-view">
        <h3 id="signup-status">Payment Information updated </h3>
        <Link to="/lessons">
          <button>Sign up for lessons under a different email address</button>
        </Link>
      </div>
    </div>
  );
};
export default UpdateCustomer;
