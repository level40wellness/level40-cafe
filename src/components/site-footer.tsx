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
              <a href="#" aria-label="Instagram">
                Ig
              </a>
              <a href="#" aria-label="Facebook">
                Fb
              </a>
              <a href="#" aria-label="LinkedIn">
                in
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
