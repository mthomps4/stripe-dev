import React, { useState, useEffect } from "react";
import RegistrationForm from "../components/RegistrationForm";
import "../css/lessons.scss";
import Header from "../components/Header";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useContext } from "react";
import { StripeContext } from "..";

// The docs say NOT to use loadStripe in the component like the example below?!
// https://github.com/stripe-samples/accept-a-payment/blob/main/custom-payment-flow/client/react-cra/src/index.js#L8
// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

//format session's date
const formatSession = (index, id, session, time) => {
  let date = session.getDate();
  if (date <= 9) {
    date = "0" + date;
  }
  date = `${date} ${months[session.getMonth()]}`;
  let title = `${date} ${time}`;
  return { index, id, title, date, time, selected: "" };
};

//Lessons main component
const Lessons = () => {
  const [sessions, setSessions] = useState([]); //info about available sessions
  const [selected, setSelected] = useState(-1); //index of selected session
  const [details, setDetails] = useState(""); //details about selected session
  const [selectedSession, setSelectedSession] = useState(null);

  //toggle selected session
  const toggleItem = (index) => {
    let items = sessions;
    if (selected !== -1) {
      items[selected].selected = "";
    }
    items[index].selected = "selected";
    setSelected(index);
    setSelectedSession(items[index]);
    setSessions(items);
    setDetails(
      `You have requested a lesson for ${items[index].title} \n Please complete this form to reserve your lesson.`
    );
  };
  //Load sessions info.
  useEffect(() => {
    let items = [];
    let session = new Date();

    session.setDate(session.getDate() + 9);
    items.push(formatSession(0, "first", session, "3:00 p.m."));

    session.setDate(session.getDate() + 5);
    items.push(formatSession(1, "second", session, "4:00 p.m."));

    session.setDate(session.getDate() + 7);
    items.push(formatSession(2, "third", session, "5:00 p.m."));
    setSessions((prev) => [...prev, ...items]);
  }, []);

  const { stripePublishableKey } = useContext(StripeContext);

  if (!stripePublishableKey) return <div>Loading...</div>;
  const stripePromise = loadStripe(stripePublishableKey);

  return (
    <main className="main-lessons">
      <Header selected="lessons" />
      {selectedSession ? (
        <Elements stripe={stripePromise}>
          <RegistrationForm session={selectedSession} details={details} />
        </Elements>
      ) : null}
      <div className="lesson-title" id="title">
        <h2>Guitar lessons</h2>
      </div>
      <div className="lesson-instruction">
        Choose from one of our available lessons to get started.
      </div>
      <div className="lessons-container">
        <div className="lessons-img">
          <img src="/assets/img/lessons.png" alt="" />
        </div>
        <div id="sr-items" className="lessons-cards">
          {sessions.map((session) => (
            <div
              className={`lesson-card ${session.selected}`}
              key={session.index}
            >
              <div className="lesson-info">
                <h2 className="lesson-date">{session.date}</h2>
                <h4 className="lesson-time">{session.time}</h4>
              </div>
              <button
                className="lesson-book"
                id={session.id}
                onClick={() => toggleItem(session.index)}
              >
                Book now!
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Lessons;
