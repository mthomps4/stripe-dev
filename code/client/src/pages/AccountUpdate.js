import React, { useContext, useEffect, useState } from "react";
import Header from "../components/Header";
import "../css/lessons.scss";
import { accountUpdate } from "../Services/account";
import UpdateCustomer from "../components/UpdateCustomer";
import { StripeContext } from "..";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

//Component responsable to update user's info.
const AccountUpdate = ({ id }) => {
  const [customer, setCustomer] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  //Get info to load page, User payment information, config API route in package.json "proxy"
  useEffect(() => {
    const setup = async () => {
      const result = await accountUpdate(id);
      if (result !== null) {
        const { customer: c, paymentMethods: pm } = result;
        setCustomer(c);
        setPaymentMethods(pm);
      }
    };
    setup();
  }, [id]);

  const { stripePublishableKey } = useContext(StripeContext);
  if (!stripePublishableKey) return <div>Loading...</div>;
  const stripePromise = loadStripe(stripePublishableKey);

  const emptyPaymentMethod = {
    billing_details: {
      name: null,
      email: null,
    },
    card: {
      billing_email: null,
      exp_month: null,
      exp_year: null,
      last4: null,
    },
  };

  const primaryPaymentMethod =
    paymentMethods.length > 0 ? paymentMethods[0] : emptyPaymentMethod;

  return (
    <main className="main-lessons">
      <Header />
      <div className="eco-items" id="account-information">
        {
          //User's info shoul be display here
        }
        <h3>Account Details</h3>
        <h4>Current Account information</h4>
        <h5>We have the following card information on file for you: </h5>
        <p>
          Billing Email:&nbsp;&nbsp;
          <span id="billing-email">
            {primaryPaymentMethod.billing_details.email}
          </span>
        </p>
        <p>
          Card Exp Month:&nbsp;&nbsp;
          <span id="card-exp-month">{primaryPaymentMethod.card.exp_month}</span>
        </p>
        <p>
          Card Exp Year:&nbsp;&nbsp;
          <span id="card-exp-year">{primaryPaymentMethod.card.exp_year}</span>
        </p>
        <p>
          Card last 4:&nbsp;&nbsp;
          <span id="card-last4">{primaryPaymentMethod.card.last4}</span>
        </p>
      </div>
      <Elements stripe={stripePromise}>
        <UpdateCustomer
          customer={customer}
          setCustomer={setCustomer}
          setPaymentMethods={setPaymentMethods}
        />
      </Elements>
    </main>
  );
};

export default AccountUpdate;
