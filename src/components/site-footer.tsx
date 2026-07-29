import Link from "next/link";

import { BrandLogo } from "./brand-logo";

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <BrandLogo variant="footer" />
            <p className="blurb">
              A modern café celebrating the warmth of Arabian hospitality with
              seasonal, chef-driven cooking. Dine in, order ahead, or scan the QR
              at your table.
            </p>
            <div className="socials">
              <a
                href="https://www.instagram.com/level40cafe?igsh=NXEzOTh3NGYwMnQ3"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram — @level40cafe"
                title="@level40cafe"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" aria-label="Facebook">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h4>Visit</h4>
            <address>
              <div>Continents Tower, JVC, Dubai</div>
              <div>+971 4 000 0000</div>
              <div>hello@level40wellness.com</div>
            </address>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li>
                <Link href="/menu">Menu &amp; Order</Link>
              </li>
              <li>
                <Link href="/shop">Shop</Link>
              </li>
              <li>
                <Link href="/subscription">Meal Plans</Link>
              </li>
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <a href="/tour.html" target="_blank" rel="noopener noreferrer">
                  Virtual Tour ↗
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Hours</h4>
            <ul>
              <li>Open daily · 8am – 12am</li>
              <li>Kitchen till 11pm</li>
              <li>Pickup &amp; delivery</li>
              <li>Crafted in Dubai</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} Level 40 Café. All rights reserved.{" "}
            <Link href="/privacy">Privacy</Link> ·{" "}
            <Link href="/terms">Terms</Link>
          </span>
          <span>Nourish · Move · Be Well</span>
        </div>
      </div>
    </footer>
  );
}
