import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [search, setSearch] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="container">
          <div className="topbar-links">
            <i className="bi bi-geo-alt-fill"></i>
            <span>Deliver to Kenya</span>
          </div>
          <div className="topbar-links">
            <Link to="/track-order"><i className="bi bi-search"></i> Track Order</Link>
            <Link to="/help"><i className="bi bi-question-circle"></i> Help</Link>
            {user ? (
              <span>Hi, {user.first_name || user.email.split('@')[0]}</span>
            ) : (
              <>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <Link to="/" className="logo">
              kili<span>mall</span>
            </Link>

            <form className="search-bar" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for products, brands and categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit">
                <i className="bi bi-search"></i>
              </button>
            </form>

            <div className="header-actions">
              {/* Wishlist */}
              <Link to="/wishlist">
                <button className="header-action-btn">
                  <i className="bi bi-heart"></i>
                  <span>Wishlist</span>
                </button>
              </Link>

              {/* Account */}
              <div style={{ position: 'relative' }}>
                <button
                  className="header-action-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <i className="bi bi-person-circle"></i>
                  <span>{user ? 'Account' : 'Sign In'}</span>
                </button>
                {showUserMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, background: 'white',
                    border: '1px solid #e8e8e8', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    minWidth: 180, zIndex: 100, padding: '8px 0'
                  }}>
                    {user ? (
                      <>
                        <Link to="/account" style={{ display: 'block', padding: '10px 16px', fontSize: 14 }}
                          onClick={() => setShowUserMenu(false)}>
                          <i className="bi bi-person me-2"></i> My Account
                        </Link>
                        <Link to="/orders" style={{ display: 'block', padding: '10px 16px', fontSize: 14 }}
                          onClick={() => setShowUserMenu(false)}>
                          <i className="bi bi-bag me-2"></i> My Orders
                        </Link>
                        <hr style={{ margin: '4px 0', borderColor: '#f0f0f0' }} />
                        <button onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#f85606' }}>
                          <i className="bi bi-box-arrow-right me-2"></i> Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" style={{ display: 'block', padding: '10px 16px', fontSize: 14 }}
                          onClick={() => setShowUserMenu(false)}>
                          <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
                        </Link>
                        <Link to="/register" style={{ display: 'block', padding: '10px 16px', fontSize: 14 }}
                          onClick={() => setShowUserMenu(false)}>
                          <i className="bi bi-person-plus me-2"></i> Register
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cart */}
              <Link to="/cart">
                <button className="header-action-btn" style={{ position: 'relative' }}>
                  <i className="bi bi-cart3"></i>
                  {cart.item_count > 0 && (
                    <span className="cart-badge">{cart.item_count > 99 ? '99+' : cart.item_count}</span>
                  )}
                  <span>Cart</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}