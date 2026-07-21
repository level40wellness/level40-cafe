"use client";

import { useState } from "react";

/**
 * Carried over from the source app, which also only set local state — nothing
 * is sent anywhere yet. Wiring this to a real inbox needs the transactional
 * email provider, so it stays a no-op rather than pretending to deliver.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="form-card reveal"
      style={{ marginBottom: "4rem" }}
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" type="text" placeholder="Your name" required />
        </div>
        <div className="field">
          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder="you@email.com"
            required
          />
        </div>
      </div>
      <div className="field full">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" placeholder="How can we help?" />
      </div>
      <button
        type="submit"
        className="btn btn-gold"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Send message
      </button>
      <p className="form-note" role="status">
        {sent
          ? "Thank you — we'll be in touch shortly."
          : "We usually reply within one business day."}
      </p>
    </form>
  );
}
