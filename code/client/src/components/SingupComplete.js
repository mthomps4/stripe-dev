import React from "react";

const SingupComplete = ({ email, last4, customerId }) => {
  return (
    <div className="lesson-complete">
      <h3 id="signup-status">
        Woohoo!
        {"\n"}
        They are going to call you the shredder
      </h3>
      <p>
        We've created a customer account with an id of{" "}
        <span id="customer-id">{customerId}</span> and saved the card ending in{" "}
        <span id="last4">{last4}</span>
      </p>
      <p>
        Please check your email at <span id="customer_email">{email}</span> for
        a welcome letter.
      </p>
      <button onClick={() => window.location.reload(false)}>
        Sign up again under a different email address
      </button>
    </div>
  );
};

export default SingupComplete;
