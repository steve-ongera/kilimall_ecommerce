import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { wishlistAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

function StarRating({ rating, count }) {
  const filled = Math.round(rating);
  return (
    <div className="product-card-rating">
      <span className="stars">
        {[1,2,3,4,5].map(i => (
          <i key={i} className={`bi bi-star${i <= filled ? '-fill' : ''}`} style={{ fontSize: 11 }}></i>
        ))}
      </span>
      <span>({count})</span>
    </div>
  );
}

export default function ProductCard({ product, onToast }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setAdding(true);
    const ok = await addToCart(product.id);
    setAdding(false);
    if (onToast) onToast(ok ? 'Added to cart!' : 'Failed to add to cart', ok ? 'success' : 'error');
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { if (onToast) onToast('Please login to save wishlist', 'error'); return; }
    setWishlisted(!wishlisted);
    try { await wishlistAPI.add(product.id); } catch {}
  };

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
  const imgSrc = product.primary_image || `${API_BASE}/media/placeholder.jpg`;

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card-image">
        <img
          src={imgSrc}
          alt={product.name}
          onError={(e) => { e.target.src = 'https://via.placeholder.com/200x200?text=No+Image'; }}
        />
        {product.discount_percent > 0 && (
          <span className="product-badge">-{product.discount_percent}%</span>
        )}
        {product.is_flash_deal && (
          <span className="product-badge flash">
            <i className="bi bi-lightning-charge-fill"></i> Flash
          </span>
        )}
        <button className={`wishlist-btn ${wishlisted ? 'active' : ''}`} onClick={handleWishlist}>
          <i className={`bi bi-heart${wishlisted ? '-fill' : ''}`}></i>
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>
        <div className="product-card-price">
          <span className="price-current">KES {Number(product.price).toLocaleString()}</span>
          {product.original_price && (
            <span className="price-original">KES {Number(product.original_price).toLocaleString()}</span>
          )}
          {product.discount_percent > 0 && (
            <span className="price-discount">{product.discount_percent}% off</span>
          )}
        </div>
        {product.review_count > 0 && (
          <StarRating rating={product.rating} count={product.review_count} />
        )}
      </div>

      <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={adding}>
        <i className="bi bi-cart-plus"></i>
        {adding ? 'Adding...' : 'Add to Cart'}
      </button>
    </Link>
  );
}