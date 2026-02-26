import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Spinner, Breadcrumb, Stars, useToast, Toast } from '../components/common';
import ProductCard from '../components/product/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [tab, setTab] = useState('description');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [related, setRelated] = useState([]);          // ← NEW
  const [relatedLoading, setRelatedLoading] = useState(false); // ← NEW
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    setLoading(true);
    productAPI.detail(slug)
      .then(({ data }) => {
        setProduct(data);
        // Fetch related products from same category
        if (data.category?.slug) {
          setRelatedLoading(true);
          productAPI.list({ category: data.category.slug, page_size: 6 })
            .then(({ data: rel }) => {
              const items = rel?.results || rel || [];
              // Exclude current product
              setRelated(items.filter(p => p.slug !== slug));
            })
            .finally(() => setRelatedLoading(false));
        }
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (!product) return null;

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
  const images = product.images?.length
    ? product.images.map(i => (i.image.startsWith('http') ? i.image : `${API_BASE}${i.image}`))
    : ['https://via.placeholder.com/400x400?text=No+Image'];

  const finalPrice = selectedVariant
    ? Number(product.price) + Number(selectedVariant.price_adjustment)
    : Number(product.price);

  const handleAddToCart = async () => {
    const ok = await addToCart(product.id, qty, selectedVariant?.id);
    showToast(ok ? 'Added to cart!' : 'Failed to add', ok ? 'success' : 'error');
  };

  const handleBuyNow = async () => {
    const ok = await addToCart(product.id, qty, selectedVariant?.id);
    if (ok) navigate('/checkout');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Please login to review', 'error'); return; }
    setSubmittingReview(true);
    try {
      await productAPI.addReview(slug, { rating: reviewRating, comment: reviewText });
      showToast('Review submitted!');
      setReviewText('');
      const { data } = await productAPI.detail(slug);
      setProduct(data);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Already reviewed or error occurred', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const variantGroups = product.variants?.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {});

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      {toast && <Toast {...toast} onClose={hideToast} />}
      <Breadcrumb items={[
        { label: 'Home', path: '/' },
        { label: product.category?.name || 'Products', path: `/products?category=${product.category?.slug}` },
        { label: product.name }
      ]} />

      {/* Main Detail Card */}
      <div className="product-detail">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

          {/* Gallery */}
          <div className="product-detail-gallery">
            <div className="main-image">
              <img src={images[activeImage]} alt={product.name}
                onError={e => e.target.src = 'https://via.placeholder.com/400x400?text=No+Image'} />
            </div>
            <div className="thumbnail-row">
              {images.map((img, i) => (
                <div key={i} className={`thumbnail ${activeImage === i ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}>
                  <img src={img} alt="" />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            {product.brand && (
              <div style={{ fontSize: 12, color: 'var(--kl-orange)', fontWeight: 600, marginBottom: 8 }}>
                {product.brand.name}
              </div>
            )}
            <h1 className="product-detail-name">{product.name}</h1>

            {product.review_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Stars rating={product.rating} />
                <span style={{ fontSize: 14, color: '#666' }}>
                  {Number(product.rating).toFixed(1)} ({product.review_count} reviews)
                </span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div className="product-detail-price">KES {finalPrice.toLocaleString()}</div>
              {product.original_price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="product-detail-original">KES {Number(product.original_price).toLocaleString()}</span>
                  {product.discount_percent > 0 && (
                    <span className="product-detail-discount">-{product.discount_percent}% OFF</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              {product.stock > 0 ? (
                <span style={{ color: 'var(--kl-green)', fontSize: 14, fontWeight: 600 }}>
                  <i className="bi bi-check-circle-fill"></i> In Stock ({product.stock} available)
                </span>
              ) : (
                <span style={{ color: 'var(--kl-red)', fontSize: 14, fontWeight: 600 }}>
                  <i className="bi bi-x-circle-fill"></i> Out of Stock
                </span>
              )}
            </div>

            {variantGroups && Object.entries(variantGroups).map(([name, variants]) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{name}:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {variants.map(v => (
                    <button key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      style={{
                        padding: '6px 14px', border: '2px solid', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                        borderColor: selectedVariant?.id === v.id ? 'var(--kl-orange)' : 'var(--kl-border)',
                        background: selectedVariant?.id === v.id ? '#fff5f0' : 'white',
                        color: selectedVariant?.id === v.id ? 'var(--kl-orange)' : 'inherit',
                        fontWeight: selectedVariant?.id === v.id ? 700 : 400,
                      }}>
                      {v.value}
                      {v.price_adjustment !== 0 && (
                        <span style={{ fontSize: 11, marginLeft: 4 }}>
                          ({v.price_adjustment > 0 ? '+' : ''}KES {v.price_adjustment})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quantity:</div>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <div className="qty-display">{qty}</div>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <button className="btn-add-to-cart" onClick={handleAddToCart} disabled={product.stock === 0}>
                <i className="bi bi-cart-plus"></i> Add to Cart
              </button>
              <button className="btn-buy-now" onClick={handleBuyNow} disabled={product.stock === 0}>
                <i className="bi bi-lightning-charge"></i> Buy Now
              </button>
            </div>

            <div style={{ background: 'var(--kl-light-gray)', borderRadius: 4, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="bi bi-truck" style={{ color: 'var(--kl-orange)', fontSize: 18 }}></i>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Nationwide Delivery</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Delivery to pickup stations across all 47 counties</div>
                </div>
              </div>
              <Link to="/checkout" style={{ fontSize: 13, color: 'var(--kl-orange)' }}>
                View pickup stations & delivery fees →
              </Link>
            </div>

            <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--kl-border)' }}>
              {product.sku && (
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>SKU: {product.sku}</div>
              )}
              {product.category && (
                <div style={{ fontSize: 12, color: '#888' }}>
                  Category: <Link to={`/products?category=${product.category.slug}`}
                    style={{ color: 'var(--kl-orange)' }}>{product.category.name}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mt-3">
        <div className="tabs p-4" style={{ paddingBottom: 0 }}>
          {['description', 'reviews', 'shipping'].map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'reviews' && ` (${product.review_count})`}
            </div>
          ))}
        </div>
        <div className="p-6">
          {tab === 'description' && (
            <div style={{ lineHeight: 1.8, color: '#444', fontSize: 14 }}
              dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br>') }} />
          )}

          {tab === 'reviews' && (
            <div>
              {product.reviews?.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>No reviews yet. Be the first!</p>
              ) : (
                <div style={{ marginBottom: 24 }}>
                  {product.reviews?.map(r => (
                    <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--kl-orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {r.user_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.user_name}</div>
                          <Stars rating={r.rating} size={12} />
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: '#555' }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
              {user && (
                <form onSubmit={handleReviewSubmit} style={{ background: 'var(--kl-light-gray)', padding: 20, borderRadius: 4 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Write a Review</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>Rating:</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5].map(i => (
                        <i key={i} onClick={() => setReviewRating(i)}
                          className={`bi bi-star${i <= reviewRating ? '-fill' : ''}`}
                          style={{ fontSize: 24, color: i <= reviewRating ? '#ffc107' : '#ddd', cursor: 'pointer' }}></i>
                      ))}
                    </div>
                  </div>
                  <textarea className="form-control" rows={4} placeholder="Share your experience..."
                    value={reviewText} onChange={e => setReviewText(e.target.value)} required />
                  <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12, padding: '10px 24px' }}
                    disabled={submittingReview}>
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'shipping' && (
            <div>
              <h3 style={{ marginBottom: 12 }}>Delivery Information</h3>
              <p style={{ color: '#555', lineHeight: 1.8, fontSize: 14 }}>
                We deliver to all 47 counties in Kenya via our pickup station network. Each county has 4-5 pickup stations
                with varying delivery fees. Select your nearest pickup station at checkout to see the exact delivery cost.
              </p>
              <div style={{ marginTop: 16, background: 'var(--kl-light-gray)', padding: 16, borderRadius: 4 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Estimated Delivery Times</div>
                <div style={{ fontSize: 13, color: '#555', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><i className="bi bi-geo-alt-fill" style={{ color: 'var(--kl-orange)' }}></i> Nairobi: 1-2 business days</div>
                  <div><i className="bi bi-geo-alt-fill" style={{ color: 'var(--kl-orange)' }}></i> Other Counties: 2-5 business days</div>
                  <div><i className="bi bi-geo-alt-fill" style={{ color: 'var(--kl-orange)' }}></i> Remote Areas: 5-7 business days</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Related Products ───────────────────────────────────────────── */}
      {(relatedLoading || related.length > 0) && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              <i className="bi bi-grid" style={{ color: 'var(--kl-orange)', marginRight: 8 }}></i>
              Related Products
            </h2>
            <Link
              to={`/products?category=${product.category?.slug}`}
              style={{ fontSize: 13, color: 'var(--kl-orange)', fontWeight: 600, textDecoration: 'none' }}
            >
              View all in {product.category?.name} →
            </Link>
          </div>

          {relatedLoading ? (
            // Skeleton placeholders
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: 180, background: '#f5f5f5' }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ height: 12, background: '#f5f5f5', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 12, background: '#f5f5f5', borderRadius: 4, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}