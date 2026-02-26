import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistAPI } from '../api';
import { useCart } from '../context/CartContext';
import { useToast, Toast, Spinner } from '../components/common';

export default function WishlistPage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart }         = useCart();
  const { toast, showToast, hideToast } = useToast();
  const navigate = useNavigate();

  const fetchWishlist = () => {
    setLoading(true);
    wishlistAPI.list()
      .then(({ data }) => setItems(data?.results || data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWishlist(); }, []);

  const handleRemove = async (id) => {
    await wishlistAPI.remove(id);
    setItems(items => items.filter(i => i.id !== id));
    showToast('Removed from wishlist', 'success');
  };

  const handleAddToCart = async (product) => {
    const ok = await addToCart({ product_id: product.id, quantity: 1 });
    showToast(ok ? 'Added to cart!' : 'Failed to add', ok ? 'success' : 'error');
  };

  const handleMoveToCart = async (item) => {
    const ok = await addToCart({ product_id: item.product.id, quantity: 1 });
    if (ok) {
      await wishlistAPI.remove(item.id);
      setItems(items => items.filter(i => i.id !== item.id));
      showToast('Moved to cart!', 'success');
    }
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {toast && <Toast {...toast} onClose={hideToast} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          <i className="bi bi-heart-fill" style={{ color: 'var(--kl-orange)', marginRight: 10 }}></i>
          My Wishlist
          {!loading && <span style={{ fontSize: 15, color: '#888', fontWeight: 400, marginLeft: 10 }}>({items.length} items)</span>}
        </h1>
        {items.length > 0 && (
          <button
            onClick={() => Promise.all(items.map(i => handleMoveToCart(i)))}
            style={{ padding: '9px 20px', background: 'var(--kl-orange)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <i className="bi bi-cart-plus"></i> Add All to Cart
          </button>
        )}
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <i className="bi bi-heart" style={{ fontSize: 56, color: '#ddd', display: 'block', marginBottom: 16 }}></i>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Your wishlist is empty</h3>
          <p style={{ color: '#888', marginBottom: 24 }}>Save items you love and come back to them anytime.</p>
          <button onClick={() => navigate('/product')} className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }}>
            <i className="bi bi-grid"></i> Browse Products
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              {/* Remove button */}
              <button onClick={() => handleRemove(item.id)}
                style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #eee', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, color: '#999', fontSize: 14 }}>
                <i className="bi bi-x"></i>
              </button>

              {/* Discount badge */}
              {item.product.discount_percent > 0 && (
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--kl-orange)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                  -{item.product.discount_percent}%
                </div>
              )}

              {/* Image */}
              <Link to={`/product/${item.product.slug}`}>
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottom: '1px solid #f8f8f8' }}>
                  <img
                    src={item.product.primary_image || 'https://via.placeholder.com/180'}
                    alt={item.product.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    onError={e => e.target.src = 'https://via.placeholder.com/180'}
                  />
                </div>
              </Link>

              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <Link to={`/product/${item.product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.product.name}
                  </div>
                </Link>

                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--kl-orange)' }}>
                    KES {Number(item.product.price).toLocaleString()}
                  </span>
                  {item.product.original_price && (
                    <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', marginLeft: 8 }}>
                      KES {Number(item.product.original_price).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Stock status */}
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  {item.product.stock > 0
                    ? <span style={{ color: 'var(--kl-green)' }}><i className="bi bi-check-circle-fill"></i> In Stock</span>
                    : <span style={{ color: 'var(--kl-red)' }}><i className="bi bi-x-circle-fill"></i> Out of Stock</span>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleMoveToCart(item)}
                    disabled={item.product.stock === 0}
                    style={{ flex: 1, padding: '8px 0', background: 'var(--kl-orange)', color: '#fff', border: 'none', borderRadius: 4, cursor: item.product.stock === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: item.product.stock === 0 ? 0.5 : 1 }}>
                    <i className="bi bi-cart-plus"></i> Move to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    style={{ padding: '8px 12px', background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#999' }}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}