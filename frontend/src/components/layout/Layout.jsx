// Navbar.jsx
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', path: '/', icon: 'bi-house' },
  { label: 'Electronics', path: '/products?category=electronics', icon: 'bi-laptop' },
  { label: 'Fashion', path: '/products?category=fashion', icon: 'bi-bag-heart' },
  { label: 'Home & Garden', path: '/products?category=home-garden', icon: 'bi-house-heart' },
  { label: 'Health & Beauty', path: '/products?category=health-beauty', icon: 'bi-heart-pulse' },
  { label: 'Phones & Tablets', path: '/products?category=phones-tablets', icon: 'bi-phone' },
  { label: 'Sports', path: '/products?category=sports', icon: 'bi-bicycle' },
  { label: 'Flash Deals', path: '/products?flash_deals=true', icon: 'bi-lightning-charge' },
];

export function Navbar() {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-inner">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`}></i>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Footer.jsx
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f85606', marginBottom: 12 }}>
              kili<span style={{ color: 'white' }}>mall</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#aaa' }}>
              Kenya's No.1 Online Shopping Mall. Quality products delivered to your doorstep.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {['bi-facebook', 'bi-twitter-x', 'bi-instagram', 'bi-youtube'].map(icon => (
                <a key={icon} href="#" style={{ color: '#aaa', fontSize: 18 }}>
                  <i className={`bi ${icon}`}></i>
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="footer-col-title">Quick Links</div>
            <ul className="footer-links">
              {['About Us', 'Careers', 'Press Center', 'Contact Us'].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Help & Support</div>
            <ul className="footer-links">
              {['Shipping Info', 'Returns & Refunds', 'Track My Order', 'FAQs', 'Customer Care'].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Sell on Kilimall</div>
            <ul className="footer-links">
              {['Seller Center', 'Seller Policies', 'List Products', 'Seller Support'].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Payment Methods</div>
            <div className="footer-payment" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <span style={{ background: '#00a651', color: 'white', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 4 }}>M-PESA</span>
              <span style={{ background: '#1a1f71', color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 4 }}>VISA</span>
              <span style={{ background: '#eb001b', color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 4 }}>MasterCard</span>
            </div>
            <div className="footer-col-title">Download App</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#" style={{ background: '#111', color: 'white', padding: '8px 14px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-apple" style={{ fontSize: 20 }}></i>
                <div><div style={{ fontSize: 10, opacity: 0.7 }}>Download on the</div><div style={{ fontWeight: 700 }}>App Store</div></div>
              </a>
              <a href="#" style={{ background: '#111', color: 'white', padding: '8px 14px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-google-play" style={{ fontSize: 20 }}></i>
                <div><div style={{ fontSize: 10, opacity: 0.7 }}>Get it on</div><div style={{ fontWeight: 700 }}>Google Play</div></div>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Kilimall. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: '#666' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#666' }}>Terms & Conditions</a>
            <a href="#" style={{ color: '#666' }}>Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Layout.jsx (default export)
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}