import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { EmptyState } from '../components/common';

export default function CartPage() {
  const { cart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

  if (cart.items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <EmptyState
          icon="bi-cart3"
          title="Your cart is empty"
          description="Browse our products and add items to your cart."
          action={<Link to="/products"><button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>Start Shopping</button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="container cart-page" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        <i className="bi bi-cart3" style={{ color: 'var(--kl-orange)' }}></i> Shopping Cart
        <span style={{ fontSize: 14, fontWeight: 400, color: '#888', marginLeft: 8 }}>({cart.item_count} items)</span>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Items */}
        <div style={{ background: 'white', border: '1px solid var(--kl-border)', borderRadius: 4 }}>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map(item => {
                const imgSrc = item.product.primary_image ||
                  `${API_BASE}/media/placeholder.jpg`;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cart-product">
                        <img className="cart-product-img" src={imgSrc} alt={item.product.name}
                          onError={e => e.target.src = 'https://via.placeholder.com/70x70?text=N/A'} />
                        <div>
                          <Link to={`/product/${item.product.slug}`} className="cart-product-name"
                            style={{ display: 'block' }}>{item.product.name}</Link>
                          {item.variant && (
                            <span style={{ fontSize: 12, color: '#888' }}>{item.variant.name}: {item.variant.value}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>KES {Number(item.product.price).toLocaleString()}</td>
                    <td>
                      <div className="qty-control" style={{ width: 'fit-content' }}>
                        <button className="qty-btn" onClick={() => updateItem(item.id, item.quantity - 1)}>−</button>
                        <div className="qty-display">{item.quantity}</div>
                        <button className="qty-btn" onClick={() => updateItem(item.id, item.quantity + 1)}>+</button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--kl-orange)' }}>
                      KES {Number(item.subtotal).toLocaleString()}
                    </td>
                    <td>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 18, cursor: 'pointer' }}
                        title="Remove">
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ padding: '16px', borderTop: '1px solid var(--kl-border)', display: 'flex', gap: 12 }}>
            <Link to="/products">
              <button style={{ background: 'none', border: '1px solid var(--kl-border)', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-arrow-left"></i> Continue Shopping
              </button>
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--kl-border)' }}>
            Order Summary
          </h2>
          <div className="cart-summary-row">
            <span>Subtotal ({cart.item_count} items)</span>
            <span>KES {Number(cart.total).toLocaleString()}</span>
          </div>
          <div className="cart-summary-row">
            <span>Delivery Fee</span>
            <span style={{ color: 'var(--kl-orange)' }}>Selected at checkout</span>
          </div>
          <div className="cart-summary-row total">
            <span>Total</span>
            <span>KES {Number(cart.total).toLocaleString()}+</span>
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/checkout')}>
            Proceed to Checkout <i className="bi bi-arrow-right"></i>
          </button>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['M-PESA', 'Visa', 'Mastercard'].map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
                <i className="bi bi-check-circle-fill" style={{ color: 'var(--kl-green)' }}></i>
                Pay securely with {m}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}