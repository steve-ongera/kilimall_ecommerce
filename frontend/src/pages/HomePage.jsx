import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI, categoryAPI, bannerAPI } from '../api';
import ProductCard from '../components/product/ProductCard';
import { Spinner, Countdown, useToast, Toast } from '../components/common';

// Hero Slider
function HeroSlider({ banners }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const slides = banners.length ? banners : [{
    title: 'Shop Smart, Shop Kenya',
    subtitle: 'Thousands of products at the best prices',
    link: '/products',
    gradient: 'linear-gradient(135deg, #f85606 0%, #ff9a3c 100%)'
  }];

  return (
    <div className="hero-slider" style={{ position: 'relative' }}>
      {slides.map((slide, i) => (
        <div key={i} className="hero-slide" style={{
          display: i === current ? 'flex' : 'none',
          background: slide.gradient || 'linear-gradient(135deg, #f85606, #ff9a3c)'
        }}>
          {slide.image && <img src={slide.image} alt={slide.title} />}
          <div className="hero-content">
            <h1>{slide.title}</h1>
            <p>{slide.subtitle}</p>
            <Link to={slide.link || '/products'}
              style={{ background: 'white', color: '#f85606', padding: '10px 28px', borderRadius: 4, fontWeight: 700, fontSize: 15, display: 'inline-block' }}>
              Shop Now <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: 'white', border: 'none', opacity: i === current ? 1 : 0.5, transition: 'all 0.3s', cursor: 'pointer' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Flash Deals Section
function FlashDealsSection({ products }) {
  const end = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5hrs from now
  return (
    <div className="section">
      <div className="flash-deal-header">
        <div className="flash-deal-title">
          <i className="bi bi-lightning-charge-fill"></i>
          FLASH DEALS
        </div>
        <div style={{ color: 'white', fontSize: 13 }}>Ends in:</div>
        <Countdown endTime={end.toISOString()} />
        <Link to="/products?flash_deals=true"
          className="see-all" style={{ marginLeft: 'auto', color: 'white' }}>
          See All <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
      <div style={{ background: 'white', border: '1px solid #e8e8e8', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: 16 }}>
        <div className="products-grid">
          {products.slice(0, 5).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}

// Category Strip
function CategoryStrip({ categories }) {
  const navigate = useNavigate();
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">Shop by Category</div>
      </div>
      <div className="categories-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
        {categories.slice(0, 12).map(cat => (
          <div key={cat.id} className="category-card"
            onClick={() => navigate(`/products?category=${cat.slug}`)}>
            {cat.icon
              ? <i className={`bi ${cat.icon}`}></i>
              : cat.image
                ? <img src={cat.image} alt={cat.name} />
                : <i className="bi bi-grid"></i>
            }
            <div className="category-card-name">{cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Products Section
function ProductSection({ title, products, link, icon }) {
  const { toast, showToast, hideToast } = useToast();
  return (
    <div className="section">
      {toast && <Toast {...toast} onClose={hideToast} />}
      <div className="section-header">
        <div className="section-title">
          {icon && <i className={`bi ${icon}`} style={{ color: '#f85606' }}></i>}
          {title}
        </div>
        <Link to={link || '/products'} className="see-all">
          See All <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
      <div className="products-grid">
        {products.slice(0, 10).map(p => (
          <ProductCard key={p.id} product={p} onToast={showToast} />
        ))}
      </div>
    </div>
  );
}

// Promo Banners
function PromoBanners() {
  const banners = [
    { bg: '#1a1a2e', color: '#f85606', title: 'Electronics Sale', sub: 'Up to 50% off', icon: 'bi-laptop', link: '/products?category=electronics' },
    { bg: '#2d1b69', color: '#a855f7', title: 'Fashion Week', sub: 'New arrivals daily', icon: 'bi-bag-heart', link: '/products?category=fashion' },
    { bg: '#0f4c75', color: '#00d4ff', title: 'Home & Garden', sub: 'Free delivery over KES 2000', icon: 'bi-house-heart', link: '/products?category=home-garden' },
  ];
  return (
    <div className="section">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {banners.map((b, i) => (
          <Link key={i} to={b.link}
            style={{ background: b.bg, borderRadius: 4, padding: 20, display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none' }}>
            <i className={`bi ${b.icon}`} style={{ fontSize: 36, color: b.color }}></i>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{b.title}</div>
              <div style={{ color: b.color, fontSize: 13 }}>{b.sub}</div>
            </div>
            <i className="bi bi-arrow-right" style={{ color: b.color, marginLeft: 'auto', fontSize: 18 }}></i>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState({ featured: [], flashDeals: [], newArrivals: [], categories: [], banners: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productAPI.featured(),
      productAPI.flashDeals(),
      productAPI.newArrivals(),
      categoryAPI.list(),
      bannerAPI.list(),
    ]).then(([feat, flash, newArr, cats, bans]) => {
      setData({
        featured: feat.data?.results || feat.data || [],
        flashDeals: flash.data?.results || flash.data || [],
        newArrivals: newArr.data?.results || newArr.data || [],
        categories: cats.data?.results || cats.data || [],
        banners: bans.data?.results || bans.data || [],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Hero + Category Sidebar */}
      <div className="container" style={{ paddingTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, marginBottom: 20 }}>
          {/* Left sidebar - categories */}
          <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 4, overflow: 'hidden' }} className="hidden-mobile">
            {data.categories.slice(0, 12).map(cat => (
              <Link key={cat.id} to={`/products?category=${cat.slug}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 13, color: '#333', borderBottom: '1px solid #f5f5f5' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f85606'}
                onMouseLeave={e => e.currentTarget.style.color = '#333'}>
                {cat.icon ? <i className={`bi ${cat.icon}`}></i> : <i className="bi bi-grid"></i>}
                {cat.name}
                <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.4 }}></i>
              </Link>
            ))}
          </div>
          {/* Hero slider */}
          <HeroSlider banners={data.banners} />
        </div>

        {/* Flash Deals */}
        {data.flashDeals.length > 0 && <FlashDealsSection products={data.flashDeals} />}

        {/* Category strip */}
        <CategoryStrip categories={data.categories} />

        {/* Promo banners */}
        <PromoBanners />

        {/* Featured */}
        {data.featured.length > 0 && (
          <ProductSection
            title="Featured Products"
            products={data.featured}
            link="/products?featured=true"
            icon="bi-star-fill"
          />
        )}

        {/* New Arrivals */}
        {data.newArrivals.length > 0 && (
          <ProductSection
            title="New Arrivals"
            products={data.newArrivals}
            link="/products"
            icon="bi-clock-history"
          />
        )}
      </div>

      {/* Trust badges */}
      <div style={{ background: 'white', borderTop: '1px solid #e8e8e8', marginTop: 32 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
            {[
              { icon: 'bi-truck', title: 'Nationwide Delivery', sub: 'To all 47 counties' },
              { icon: 'bi-shield-check', title: '100% Genuine', sub: 'Verified authentic products' },
              { icon: 'bi-arrow-return-left', title: 'Easy Returns', sub: '7-day return policy' },
              { icon: 'bi-headset', title: '24/7 Support', sub: 'Always here to help' },
            ].map(b => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
                <i className={`bi ${b.icon}`} style={{ fontSize: 28, color: '#f85606' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}