import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { categoryAPI, productAPI } from '../api';
import ProductCard from '../components/product/ProductCard';
import { Spinner, Breadcrumb, Pagination, useToast, Toast } from '../components/common';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'price',       label: 'Price: Low to High' },
  { value: '-price',      label: 'Price: High to Low' },
  { value: '-rating',     label: 'Top Rated' },
  { value: '-views',      label: 'Most Popular' },
];

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [category, setCategory]         = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  const [filters, setFilters] = useState({
    search:    '',
    minPrice:  '',
    maxPrice:  '',
    sort:      '-created_at',
    subcat:    '',
  });

  // Load category info
  useEffect(() => {
    setLoading(true);
    // Reset filters when category changes
    setFilters({ search: '', minPrice: '', maxPrice: '', sort: '-created_at', subcat: '' });
    setPage(1);
    categoryAPI.detail(slug)
      .then(({ data }) => {
        setCategory(data);
        setSubcategories(data.children || []);
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch products
  useEffect(() => {
    if (loading) return;
    setProductsLoading(true);
    const params = {
      category: filters.subcat || slug,
      page,
      ordering: filters.sort,
    };
    if (filters.search)   params.search    = filters.search;
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;

    productAPI.list(params)
      .then(({ data }) => {
        setProducts(data?.results || data || []);
        setTotal(data?.count || 0);
      })
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, [filters, page, loading, slug]);

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', minPrice: '', maxPrice: '', sort: '-created_at', subcat: '' });
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // search is already bound via updateFilter on input change — just trigger re-fetch
    setPage(1);
  };

  if (loading) return <Spinner />;
  if (!category) return null;

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      {toast && <Toast {...toast} onClose={hideToast} />}

      <Breadcrumb items={[
        { label: 'Home', path: '/' },
        { label: 'All Products', path: '/products' },
        { label: category.name },
      ]} />

      {/* Category Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--kl-orange) 0%, #ff8c00 100%)',
        borderRadius: 8, padding: '20px 28px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {category.icon && <i className={`bi ${category.icon}`} style={{ fontSize: 28 }}></i>}
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{category.name}</h1>
          </div>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 13 }}>
            {total > 0 ? `${total.toLocaleString()} products available` : 'Explore our collection'}
          </p>
        </div>
        {category.image && (
          <img src={category.image} alt="" style={{ height: 70, opacity: 0.25, position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            onClick={() => updateFilter('subcat', '')}
            style={pillStyle(!filters.subcat)}
          >
            All {category.name}
          </button>
          {subcategories.map(sub => (
            <button key={sub.slug}
              onClick={() => updateFilter('subcat', sub.slug)}
              style={pillStyle(filters.subcat === sub.slug)}
            >
              {sub.icon && <i className={`bi ${sub.icon}`} style={{ marginRight: 4 }}></i>}
              {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="layout-grid">
        {/* ── Sidebar ── */}
        <aside className="filter-sidebar">

          {/* Search */}
          <div className="filter-section">
            <div className="filter-title">Search</div>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 0 }}>
              <input
                className="price-input"
                style={{ flex: 1, borderRadius: '4px 0 0 4px', borderRight: 'none', padding: '8px 10px' }}
                placeholder={`Search in ${category.name}...`}
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
              />
              <button type="submit" style={{
                padding: '8px 12px', background: 'var(--kl-orange)', color: '#fff',
                border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer',
              }}>
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <div className="filter-title">Price Range (KES)</div>
            <div className="price-range">
              <input className="price-input" placeholder="Min" type="number"
                value={filters.minPrice} onChange={e => updateFilter('minPrice', e.target.value)} />
              <span style={{ color: '#aaa' }}>–</span>
              <input className="price-input" placeholder="Max" type="number"
                value={filters.maxPrice} onChange={e => updateFilter('maxPrice', e.target.value)} />
            </div>
          </div>

          {/* Subcategories in sidebar too */}
          {subcategories.length > 0 && (
            <div className="filter-section">
              <div className="filter-title">Subcategories</div>
              <div className="filter-option"
                onClick={() => updateFilter('subcat', '')}
                style={{ fontWeight: !filters.subcat ? 700 : 400, color: !filters.subcat ? 'var(--kl-orange)' : 'inherit' }}>
                <span>All {category.name}</span>
              </div>
              {subcategories.map(sub => (
                <div key={sub.slug} className="filter-option"
                  onClick={() => updateFilter('subcat', sub.slug)}
                  style={{ fontWeight: filters.subcat === sub.slug ? 700 : 400, color: filters.subcat === sub.slug ? 'var(--kl-orange)' : 'inherit' }}>
                  {sub.icon && <i className={`bi ${sub.icon}`}></i>}
                  <span>{sub.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Clear */}
          <button
            onClick={clearFilters}
            style={{ width: '100%', background: 'none', border: '1px solid var(--kl-border)', borderRadius: 4, padding: '8px', fontSize: 13, cursor: 'pointer', color: 'var(--kl-gray)' }}
          >
            <i className="bi bi-x-circle"></i> Clear Filters
          </button>
        </aside>

        {/* ── Products Area ── */}
        <div>
          {/* Sort bar */}
          <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 4, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#666' }}>
              <strong style={{ color: '#333' }}>{total.toLocaleString()}</strong> products found
              {filters.search && <span style={{ color: 'var(--kl-orange)' }}> for "{filters.search}"</span>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Sort by:</span>
              <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)}
                style={{ border: '1px solid #e8e8e8', borderRadius: 4, padding: '6px 12px', fontSize: 13, outline: 'none' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {productsLoading ? <Spinner /> : (
            <>
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 4 }}>
                  <i className="bi bi-search" style={{ fontSize: 48, color: '#ddd', display: 'block', marginBottom: 12 }}></i>
                  <h3 style={{ color: '#666', marginBottom: 8 }}>No products found</h3>
                  <p style={{ color: '#aaa', fontSize: 14 }}>
                    {filters.search
                      ? `No results for "${filters.search}" in ${category.name}.`
                      : `No products in ${category.name} yet.`}
                  </p>
                  <button onClick={clearFilters}
                    style={{ marginTop: 12, padding: '8px 20px', background: 'var(--kl-orange)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map(p => <ProductCard key={p.id} product={p} onToast={showToast} />)}
                </div>
              )}
              <Pagination current={page} total={total} pageSize={20} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const pillStyle = (active) => ({
  padding: '7px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
  fontWeight: active ? 600 : 400, border: '2px solid', transition: 'all 0.15s',
  borderColor: active ? 'var(--kl-orange)' : '#e8e8e8',
  background: active ? 'var(--kl-orange)' : '#fff',
  color: active ? '#fff' : '#333',
});