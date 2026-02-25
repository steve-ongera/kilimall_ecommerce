import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryAPI, orderAPI, mpesaAPI } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common';

// ─── M-Pesa Modal ─────────────────────────────────────────────────────────────
function MpesaModal({ order, onSuccess, onClose }) {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | pending | polling | success | failed
  const [checkoutId, setCheckoutId] = useState(null);
  const [message, setMessage] = useState('');

  const handlePay = async () => {
    if (!phone) return;
    setStatus('pending');
    try {
      const { data } = await mpesaAPI.stkPush({ phone_number: phone, order_id: order.id });
      setCheckoutId(data.checkout_request_id);
      setStatus('polling');
      setMessage(data.message);
    } catch (err) {
      setStatus('failed');
      setMessage(err.response?.data?.error || 'Payment failed. Please try again.');
    }
  };

  // Poll for status
  useEffect(() => {
    if (status !== 'polling' || !checkoutId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await mpesaAPI.status(checkoutId);
        if (data.status === 'success') {
          setStatus('success');
          clearInterval(interval);
          setTimeout(onSuccess, 2000);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus('failed');
          setMessage('Payment was cancelled or failed. Try again.');
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [status, checkoutId]);

  return (
    <div className="mpesa-modal" onClick={e => e.target === e.currentTarget && status !== 'polling' && onClose()}>
      <div className="mpesa-modal-inner">
        <div className="mpesa-logo">M-PESA</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Pay KES {Number(order.total).toLocaleString()}
        </h3>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Order #{order.order_number}</p>

        {status === 'idle' && (
          <>
            <p style={{ color: '#555', fontSize: 13, marginBottom: 16 }}>
              Enter your Safaricom number to receive an M-Pesa prompt.
            </p>
            <div className="mpesa-phone-input">
              <div className="mpesa-prefix">+254</div>
              <input type="tel" placeholder="712 345 678" value={phone}
                onChange={e => setPhone(e.target.value)} maxLength={10} />
            </div>
            <button className="btn-mpesa" onClick={handlePay}>
              <i className="bi bi-phone"></i> Send M-Pesa Request
            </button>
            <button onClick={onClose} style={{ width: '100%', marginTop: 12, background: 'none', border: '1px solid #e8e8e8', padding: 10, borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          </>
        )}

        {status === 'pending' && (
          <div className="mpesa-status">
            <div className="mpesa-spinner"></div>
            <p style={{ color: '#555', fontSize: 14 }}>Sending M-Pesa request...</p>
          </div>
        )}

        {status === 'polling' && (
          <div className="mpesa-status">
            <div className="mpesa-spinner"></div>
            <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Check your phone!</p>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 8 }}>
              An M-Pesa STK push has been sent to <strong>{phone}</strong>.
            </p>
            <p style={{ color: '#888', fontSize: 13 }}>Enter your PIN to complete payment. Waiting for confirmation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mpesa-status">
            <i className="bi bi-check-circle-fill" style={{ fontSize: 52, color: '#00a651', display: 'block', marginBottom: 12 }}></i>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#00a651', marginBottom: 8 }}>Payment Successful!</p>
            <p style={{ color: '#555', fontSize: 14 }}>Redirecting to your order...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="mpesa-status">
            <i className="bi bi-x-circle-fill" style={{ fontSize: 52, color: 'var(--kl-red)', display: 'block', marginBottom: 12 }}></i>
            <p style={{ fontWeight: 700, color: 'var(--kl-red)', marginBottom: 8 }}>Payment Failed</p>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>{message}</p>
            <button className="btn-mpesa" onClick={() => setStatus('idle')}>Try Again</button>
            <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'none', border: '1px solid #e8e8e8', padding: 10, borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Checkout ─────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [counties, setCounties] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [showMpesa, setShowMpesa] = useState(false);

  const [form, setForm] = useState({
    customer_name: user ? `${user.first_name} ${user.last_name}`.trim() : '',
    customer_phone: user?.phone || '',
    customer_email: user?.email || '',
    notes: '',
  });

  useEffect(() => {
    deliveryAPI.counties()
      .then(({ data }) => setCounties(data?.results || data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCounty) { setStations([]); setSelectedStation(null); return; }
    deliveryAPI.stations(selectedCounty).then(({ data }) => {
      setStations(data?.results || data || []);
      setSelectedStation(null);
    });
  }, [selectedCounty]);

  const total = selectedStation
    ? Number(cart.total) + Number(selectedStation.delivery_fee)
    : Number(cart.total);

  const handlePlaceOrder = async () => {
    if (!selectedStation) { alert('Please select a pickup station.'); return; }
    setSubmitting(true);
    try {
      const { data } = await orderAPI.create({
        ...form,
        pickup_station_id: selectedStation.id,
      });
      setOrder(data);
      setShowMpesa(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchCart();
    navigate(`/orders/${order.id}?success=true`);
  };

  if (loading || cart.items.length === 0) {
    return cart.items.length === 0
      ? <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>
          <p>Your cart is empty.</p>
          <button onClick={() => navigate('/products')} className="btn-primary" style={{ width: 'auto', padding: '10px 24px', marginTop: 12 }}>Shop Now</button>
        </div>
      : <Spinner />;
  }

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      {showMpesa && order && (
        <MpesaModal order={order} onSuccess={handlePaymentSuccess} onClose={() => setShowMpesa(false)} />
      )}

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        <i className="bi bi-bag-check" style={{ color: 'var(--kl-orange)' }}></i> Checkout
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Step 1: Contact */}
          <div className="checkout-step">
            <div className="step-header">
              <div className="step-number">1</div>
              <div className="step-title">Contact Information</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" placeholder="John Doe"
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-control" placeholder="0712 345 678" type="tel"
                  value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-control" placeholder="john@example.com" type="email"
                value={form.customer_email}
                onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Order Notes (optional)</label>
              <textarea className="form-control" rows={2} placeholder="Special instructions..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Step 2: Pickup Station */}
          <div className="checkout-step">
            <div className="step-header">
              <div className="step-number">2</div>
              <div className="step-title">Select Pickup Station</div>
            </div>

            <div className="form-group">
              <label className="form-label">Select County</label>
              <select className="form-control" value={selectedCounty}
                onChange={e => setSelectedCounty(e.target.value)}>
                <option value="">-- Select County --</option>
                {counties.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {stations.length > 0 && (
              <div>
                <label className="form-label">Choose a Pickup Station</label>
                <div className="station-grid">
                  {stations.map(station => (
                    <div key={station.id}
                      className={`station-card ${selectedStation?.id === station.id ? 'selected' : ''}`}
                      onClick={() => setSelectedStation(station)}>
                      <div className="station-name">
                        {selectedStation?.id === station.id && (
                          <i className="bi bi-check-circle-fill" style={{ color: 'var(--kl-orange)', marginRight: 6 }}></i>
                        )}
                        {station.name}
                      </div>
                      <div className="station-address">
                        <i className="bi bi-geo-alt" style={{ color: 'var(--kl-gray)' }}></i> {station.address}
                      </div>
                      {station.working_hours && (
                        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                          <i className="bi bi-clock"></i> {station.working_hours}
                        </div>
                      )}
                      <div className="station-fee">
                        <i className="bi bi-truck"></i> KES {Number(station.delivery_fee).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedCounty && stations.length === 0 && (
              <p style={{ color: '#888', fontSize: 14 }}>No stations available in this county.</p>
            )}
          </div>

          {/* Step 3: Payment */}
          <div className="checkout-step">
            <div className="step-header">
              <div className="step-number">3</div>
              <div className="step-title">Payment Method</div>
            </div>
            <div style={{ border: '2px solid #00a651', borderRadius: 8, padding: 16, background: '#f0fff6', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#00a651' }}>M-PESA</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Pay via M-Pesa STK Push</div>
                <div style={{ fontSize: 13, color: '#555' }}>You'll receive a prompt on your phone to enter your PIN</div>
              </div>
              <i className="bi bi-check-circle-fill" style={{ marginLeft: 'auto', color: '#00a651', fontSize: 24 }}></i>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="cart-summary" style={{ position: 'sticky', top: 80 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Order Summary</h2>

          {/* Items */}
          <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
            {cart.items.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 48, height: 48, border: '1px solid #e8e8e8', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={item.product.primary_image || 'https://via.placeholder.com/48'} alt={item.product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 2 }}>{item.product.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--kl-orange)' }}>
                  KES {Number(item.subtotal).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>KES {Number(cart.total).toLocaleString()}</span>
          </div>
          <div className="cart-summary-row">
            <span>Delivery Fee</span>
            {selectedStation
              ? <span style={{ fontWeight: 700 }}>KES {Number(selectedStation.delivery_fee).toLocaleString()}</span>
              : <span style={{ color: '#aaa', fontSize: 12 }}>Select station</span>
            }
          </div>
          <div className="cart-summary-row total">
            <span>Total</span>
            <span>KES {total.toLocaleString()}</span>
          </div>

          <button className="btn-primary" style={{ marginTop: 16 }}
            onClick={handlePlaceOrder}
            disabled={submitting || !selectedStation || !form.customer_name || !form.customer_phone}>
            {submitting
              ? <><div className="mpesa-spinner" style={{ width: 18, height: 18, borderWidth: 2, display: 'inline-block', marginRight: 8 }}></div>Placing Order...</>
              : <><i className="bi bi-lock-fill"></i> Place Order & Pay</>
            }
          </button>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
            <i className="bi bi-shield-check"></i> Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}