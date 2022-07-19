/* eslint-disable no-console */
const express = require("express");

const app = express();
const { resolve } = require("path");
// Replace if using a different env file or config
require("dotenv").config({ path: "./.env" });
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const allitems = {};

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) throw new Error("Missing Stripe Secret Key");

// const MIN_ITEMS_FOR_DISCOUNT = 2;
app.use(express.static(process.env.STATIC_DIR));

app.use(
  express.json({
    // Should use middleware or a function to compute it only when
    // hitting the Stripe webhook endpoint.
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(cors({ origin: true }));

// load config file
const fs = require("fs");

const configFile = fs.readFileSync("../config.json");
const config = JSON.parse(configFile);

// load items file for video courses
const file = require("../items.json");
const { default: Stripe } = require("stripe");
const { format } = require("util");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

file.forEach((item) => {
  const initializedItem = item;
  initializedItem.selected = false;
  allitems[item.itemId] = initializedItem;
});

// const asyncMiddleware = fn => (req, res, next) => {
//   Promise.resolve(fn(req, res, next)).catch(next);
// };

// Routes
app.get("/", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/index.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/concert", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/concert.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/setup-concert-page", (req, res) => {
  res.send({
    basePrice: config.checkout_base_price,
    currency: config.checkout_currency,
  });
});

// Show success page, after user buy concert tickets
app.get("/concert-success", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/concert-success.html`);
    console.log(path);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/videos", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/videos.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/setup-video-page", (req, res) => {
  res.send({
    discountFactor: config.video_discount_factor,
    minItemsForDiscount: config.video_min_items_for_discount,
    items: allitems,
  });
});

// Milestone 1: Signing up
// Shows the lesson sign up page.
app.get("/lessons", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/lessons.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.post("/lessons", async (req, res) => {
  const {
    body: { date, time, name, email },
  } = req;

  const lessonMetaData = JSON.stringify({
    date,
    time,
  });

  try {
    // already exists check (NO DB in Challenge)
    const { data: existingCustomers = [] } = await stripe.customers.list({
      email,
    });

    if (existingCustomers.length > 0) {
      return res.json({
        error: {
          type: "CUSTOMER_EXISTS",
          message: `customer already exists with email: ${email}`,
        },
      });
    }

    // Create Customer w/ uniq email
    // - add meta data "first_lesson" - Lesson date and time they select
    const customer = await stripe.customers.create({
      name,
      email,
      metadata: {
        first_lesson: lessonMetaData,
      },
    });

    // Create Intent w/out payment
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      metadata: {
        first_lesson: lessonMetaData,
      },
      expand: ["customer"],
    });

    return res.json({ setupIntent });
  } catch (error) {
    return res.json({ error });
  }
});

// Milestone 2: '/schedule-lesson'
// Authorize a payment for a lesson
//
// Parameters:
// customer_id: id of the customer
// amount: amount of the lesson in cents
// description: a description of this lesson
//
// Example call:
// curl -X POST http://localhost:4242/schdeule-lesson \
//  -d customer_id=cus_GlY8vzEaWTFmps \
//  -d amount=4500 \
//  -d description='Lesson on Feb 25th'
//
// Returns: a JSON response of one of the following forms:
// For a successful payment, return the Payment Intent:
//   {
//        payment: <payment_intent>
//    }
//
// For errors:
//  {
//    error:
//       code: the code returned from the Stripe error if there was one
//       message: the message returned from the Stripe error. if no payment method was
//         found for that customer return an msg 'no payment methods found for <customer_id>'
//    payment_intent_id: if a payment intent was created but not successfully authorized
// }

// return {payment, error: {code, message, payment_intent_id}}
app.post("/schedule-lesson", async (req, res) => {
  const { customer_id: customerId, amount, description } = req.body;

  const sendError = (e, intentId) => {
    const defaultErrorMessage = `No Customer or Payment Method Found for ${customerId}`;

    return res.status(400).json({
      error: {
        ...e,
        message: e.message || defaultErrorMessage,
        payment_intent_id: intentId,
      },
    });
  };

  stripe.customers
    .listPaymentMethods(customerId, { type: "card" })
    .then((methods) => {
      if (methods?.data?.length == 0) {
        throw new Error("No Payment Method Found for Customer");
      }

      const paymentMethodId = methods?.data[0]?.id;

      stripe.paymentIntents
        .create({
          payment_method_types: ["card"],
          amount,
          currency: "usd",
          capture_method: "manual", // place hold on card
          confirm: true,
          customer: customerId,
          description,
          payment_method: paymentMethodId,
          metadata: {
            type: "lessons-payment",
          },
        })
        .then((payment) => {
          console.log({ payment });
          return res.status(200).json({ payment });
        })
        .catch((e) => {
          sendError(e);
        });
    })
    .catch((e) => {
      sendError(e);
    });
});

// Milestone 2: '/complete-lesson-payment'
// Capture a payment for a lesson.
//
// Parameters:
// amount: (optional) amount to capture if different than the original amount authorized
//
// Example call:
// curl -X POST http://localhost:4242/complete_lesson_payment \
//  -d payment_intent_id=pi_XXX \
//  -d amount=4500
//
// Returns: a JSON response of one of the following forms:
//
// For a successful payment, return the payment intent:
//   {
//        payment: <payment_intent>
//    }
//
// for errors:
//  {
//    error:
//       code: the code returned from the error
//       message: the message returned from the error from Stripe
// }
//
app.post("/complete-lesson-payment", async (req, res) => {
  const { payment_intent_id, amount = undefined } = req.body;

  const handleError = (error) => {
    console.log({ error });
    // raw includes the `message`  and `code` - error is the full response stack.
    return res.status(400).json({ error: error.raw });
  };

  const handleSuccess = (payment) => {
    return res.status(200).json({ payment });
  };

  const confirmPayment = () => {
    stripe.paymentIntents
      .confirm(payment_intent_id)
      .then((payment) => handleSuccess(payment))
      .catch((e) => handleError(e));
  };

  const processPayment = (intent) => {
    const validAmountChange = amount ? amount <= intent.amount : true;
    const shouldCapture =
      intent.status === "requires_capture" && validAmountChange;

    // If requires capture
    if (shouldCapture) {
      const amount_to_capture =
        amount <= intent.amount ? amount : intent.amount;

      stripe.paymentIntents
        .capture(payment_intent_id, { amount_to_capture })
        .then((payment) => handleSuccess(payment))
        .catch((e) => handleError(e));
    }

    // update or confirm
    if (validAmountChange) {
      stripe.paymentIntents
        .update(payment_intent_id, { amount })
        .then(() => confirmPayment())
        .catch((e) => handleError(e));
    }

    confirmPayment();
  };

  return stripe.paymentIntents
    .retrieve(payment_intent_id)
    .then((intent) => processPayment(intent))
    .catch((e) => handleError(e));
});

// Milestone 2: '/refund-lesson'
// Refunds a lesson payment.  Refund the payment from the customer (or cancel the auth
// if a payment hasn't occurred).
// Sets the refund reason to 'requested_by_customer'
//
// Parameters:
// payment_intent_id: the payment intent to refund
// amount: (optional) amount to refund if different than the original payment
//
// Example call:
// curl -X POST http://localhost:4242/refund-lesson \
//   -d payment_intent_id=pi_XXX \
//   -d amount=2500
//
// Returns
// If the refund is successfully created returns a JSON response of the format:
//
// {
//   refund: refund.id
// }
//
// If there was an error:
//  {
//    error: {
//        code: e.error.code,
//        message: e.error.message
//      }
//  }
app.post("/refund-lesson", async (req, res) => {});

// Milestone 3: Managing account info
// Displays the account update page for a given customer
app.get("/account-update/:customer_id", async (req, res) => {});

// Milestone 3: '/delete-account'
// Deletes a customer object if there are no uncaptured payment intents for them.
//
// Parameters:
//   customer_id: the id of the customer to delete
//
// Example request
//   curl -X POST http://localhost:4242/delete-account \
//    -d customer_id=cusXXX
//
// Returns 1 of 3 responses:
// If the customer had no uncaptured charges and was successfully deleted returns the response:
//   {
//        deleted: true
//   }
//
// If the customer had uncaptured payment intents, return a list of the payment intent ids:
//   {
//     uncaptured_payments: ids of any uncaptured payment intents
//   }
//
// If there was an error:
//  {
//    error: {
//        code: e.error.code,
//        message: e.error.message
//      }
//  }
//

app.post("/delete-account/:customer_id", async (req, res) => {});

// Milestone 4: '/calculate-lesson-total'
// Returns the total amounts for payments for lessons, ignoring payments
// for videos and concert tickets.
//
// Example call: curl -X GET http://localhost:4242/calculate-lesson-total
//
// Returns a JSON response of the format:
// {
//      payment_total: total before fees and refunds (including disputes), and excluding payments
//         that haven't yet been captured.
//         This should be equivalent to net + fee totals.
//      fee_total: total amount in fees that the store has paid to Stripe
//      net_total: net amount the store has earned from the payments.
// }
//
app.get("/calculate-lesson-total", async (req, res) => {});

// Milestone 4: '/find-customers-with-failed-payments'
// Returns any customer who meets the following conditions:
// The last attempt to make a payment for that customer failed.
// The payment method associated with that customer is the same payment method used
// for the failed payment, in other words, the customer has not yet supplied a new payment method.
//
// Example request: curl -X GET http://localhost:4242/find-customers-with-failed-payments
//
// Returns a JSON response with information about each customer identified and
// their associated last payment
// attempt and, info about the payment method on file.
// [
//   <customer_id>: {
//     customer: {
//       email: customer.email,
//       name: customer.name,
//     },
//     payment_intent: {
//       created: created timestamp for the payment intent
//       description: description from the payment intent
//       status: the status of the payment intent
//       error: the error returned from the payment attempt
//     },
//     payment_method: {
//       last4: last four of the card stored on the customer
//       brand: brand of the card stored on the customer
//     }
//   },
//   <customer_id>: {},
//   <customer_id>: {},
// ]
app.get("/find-customers-with-failed-payments", async (req, res) => {});

function errorHandler(err, req, res, next) {
  res.status(500).send({ error: { message: err.message } });
}

app.get("/config", (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.use(errorHandler);

app.listen(4242, () =>
  console.log(`Node server listening on port http://localhost:${4242}`)
);
