import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { orderAPI } from '../api';
import { Spinner, Breadcrumb } from '../components/common';

function StatusBadge({ status }) {
  return <span className={`order-status ${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.list()
      .then(({ data }) => setOrders(data?.results || data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'My Orders' }]} />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        <i className="bi bi-bag" style={{ color: 'var(--kl-orange)' }}></i> My Orders
      </h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 4 }}>
          <i className="bi bi-bag" style={{ fontSize: 52, color: '#ddd', display: 'block', marginBottom: 12 }}></i>
          <h3 style={{ color: '#666', marginBottom: 8 }}>No orders yet</h3>
          <p style={{ color: '#aaa', marginBottom: 20 }}>Start shopping to see your orders here.</p>
          <Link to="/products"><button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>Shop Now</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div key={order.id} className="card p-4" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>#{order.order_number}</span>
                  <StatusBadge status={order.status} />
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                  {order.items?.length || 0} item(s) · {order.pickup_station?.name}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--kl-orange)' }}>
                  KES {Number(order.total).toLocaleString()}
                </div>
              </div>
              <Link to={`/orders/${order.id}`}>
                <button style={{ border: '1px solid var(--kl-orange)', background: 'none', color: 'var(--kl-orange)', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  View Order <i className="bi bi-arrow-right"></i>
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSuccess = searchParams.get('success') === 'true';

  useEffect(() => {
    orderAPI.detail(id)
      .then(({ data }) => setOrder(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!order) return <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>Order not found.</div>;

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'My Orders', path: '/orders' }, { label: `#${order.order_number}` }]} />

      {isSuccess && (
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 20, marginBottom: 20, textAlign: 'center' }}>
          <i className="bi bi-check-circle-fill" style={{ fontSize: 36, color: '#52c41a', display: 'block', marginBottom: 8 }}></i>
          <h2 style={{ color: '#52c41a', fontWeight: 800, marginBottom: 4 }}>Order Placed Successfully!</h2>
          <p style={{ color: '#555' }}>Thank you for your order. We'll notify you when it's ready for pickup.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Order Details */}
        <div>
          <div className="card p-6 mb-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Order #{order.order_number}</h2>
                <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                  Placed on {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Progress bar */}
            {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s, i) => {
              const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
              const current = steps.indexOf(order.status);
              const done = i <= current;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? 'var(--kl-orange)' : '#e8e8e8', color: done ? 'white' : '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {done ? <i className="bi bi-check"></i> : i + 1}
                  </div>
                  <div style={{ flex: 1, height: 3, background: done && i < current ? 'var(--kl-orange)' : '#e8e8e8', margin: '0 8px' }}></div>
                  <span style={{ fontSize: 13, color: done ? 'var(--kl-orange)' : '#aaa', fontWeight: done ? 600 : 400, minWidth: 80 }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card p-6">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Order Items</h3>
            {order.items?.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 60, height: 60, border: '1px solid #e8e8e8', borderRadius: 4, background: '#f9f9f9', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                  {item.variant_name && <div style={{ fontSize: 12, color: '#888' }}>{item.variant_name}</div>}
                  <div style={{ fontSize: 13, color: '#666' }}>
                    KES {Number(item.unit_price).toLocaleString()} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--kl-orange)' }}>
                  KES {Number(item.subtotal).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card p-4">
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
              <i className="bi bi-geo-alt-fill" style={{ color: 'var(--kl-orange)' }}></i> Pickup Station
            </h3>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{order.pickup_station?.name}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{order.pickup_station?.address}</div>
            {order.pickup_station?.phone && (
              <div style={{ fontSize: 13, color: '#666' }}><i className="bi bi-phone"></i> {order.pickup_station.phone}</div>
            )}
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
              <i className="bi bi-clock"></i> {order.pickup_station?.working_hours}
            </div>
          </div>

          <div className="card p-4">
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
              <i className="bi bi-person-fill" style={{ color: 'var(--kl-orange)' }}></i> Customer
            </h3>
            <div style={{ fontSize: 14 }}>{order.customer_name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{order.customer_phone}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{order.customer_email}</div>
          </div>

          <div className="card p-4">
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
              <i className="bi bi-receipt" style={{ color: 'var(--kl-orange)' }}></i> Summary
            </h3>
            {[
              { label: 'Subtotal', value: `KES ${Number(order.subtotal).toLocaleString()}` },
              { label: 'Delivery', value: `KES ${Number(order.delivery_fee).toLocaleString()}` },
              { label: 'Total', value: `KES ${Number(order.total).toLocaleString()}`, bold: true },
              { label: 'Payment', value: order.payment_status, badge: true },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderTop: r.bold ? '1px solid #e8e8e8' : 'none', marginTop: r.bold ? 6 : 0 }}>
                <span style={{ color: '#666' }}>{r.label}</span>
                {r.badge
                  ? <StatusBadge status={order.payment_status} />
                  : <span style={{ fontWeight: r.bold ? 800 : 600, color: r.bold ? 'var(--kl-orange)' : 'inherit' }}>{r.value}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}