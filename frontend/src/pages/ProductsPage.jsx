import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI, categoryAPI } from '../api';
import ProductCard from '../components/product/ProductCard';
import { Spinner, Breadcrumb, Pagination, useToast, Toast } from '../components/common';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'price',       label: 'Price: Low to High' },
  { value: '-price',      label: 'Price: High to Low' },
  { value: '-rating',     label: 'Top Rated' },
  { value: '-views',      label: 'Most Popular' },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const { toast, showToast, hideToast } = useToast();

  const [filters, setFilters] = useState({
    search:      searchParams.get('search')       || '',
    category:    searchParams.get('category')     || '',
    minPrice:    searchParams.get('min_price')    || '',
    maxPrice:    searchParams.get('max_price')    || '',
    sort:        searchParams.get('ordering')     || '-created_at',
    flash_deals: searchParams.get('is_flash_deal')|| '',
    featured:    searchParams.get('is_featured')  || '',
  });

  // Local search input — only applied on submit
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    categoryAPI.list().then(({ data }) => setCategories(data?.results || data || []));
  }, []);

  // Sync URL params when filters change
  useEffect(() => {
    const p = {};
    if (filters.search)      p.search        = filters.search;
    if (filters.category)    p.category      = filters.category;
    if (filters.minPrice)    p.min_price     = filters.minPrice;
    if (filters.maxPrice)    p.max_price     = filters.maxPrice;
    if (filters.sort !== '-created_at') p.ordering = filters.sort;
    if (filters.flash_deals) p.is_flash_deal = filters.flash_deals;
    if (filters.featured)    p.is_featured   = filters.featured;
    setSearchParams(p, { replace: true });
  }, [filters]);

  // Fetch products
  useEffect(() => {
    setLoading(true);
    const params = { page, ordering: filters.sort };
    if (filters.search)      params.search       = filters.search;
    if (filters.category)    params.category     = filters.category;  // ← fixed: was category__slug
    if (filters.minPrice)    params.min_price    = filters.minPrice;  // ← fixed: was price__gte
    if (filters.maxPrice)    params.max_price    = filters.maxPrice;  // ← fixed: was price__lte
    if (filters.flash_deals) params.is_flash_deal = true;
    if (filters.featured)    params.is_featured  = true;

    productAPI.list(params)
      .then(({ data }) => {
        setProducts(data?.results || data || []);
        setTotal(data?.count || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, page]);

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', minPrice: '', maxPrice: '', sort: '-created_at', flash_deals: '', featured: '' });
    setSearchInput('');
    setPage(1);
  };

  const activeCategory = categories.find(c => c.slug === filters.category);

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      {toast && <Toast {...toast} onClose={hideToast} />}

      <Breadcrumb items={[
        { label: 'Home', path: '/' },
        { label: filters.search ? `Search: "${filters.search}"` : activeCategory?.name || 'All Products' }
      ]} />

      <div className="layout-grid">
        {/* ── Sidebar ── */}
        <aside className="filter-sidebar">

          {/* Search */}
          <div className="filter-section">
            <div className="filter-title">Search</div>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex' }}>
              <input
                className="price-input"
                style={{ flex: 1, borderRadius: '4px 0 0 4px', borderRight: 'none', padding: '8px 10px' }}
                placeholder="Search products..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" style={{
                padding: '8px 12px', background: 'var(--kl-orange)', color: '#fff',
                border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer',
              }}>
                <i className="bi bi-search"></i>
              </button>
            </form>
            {/* Clear search chip */}
            {filters.search && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--kl-orange)' }}>
                <i className="bi bi-search"></i>
                <span>"{filters.search}"</span>
                <i className="bi bi-x" style={{ cursor: 'pointer', marginLeft: 'auto' }}
                  onClick={() => { updateFilter('search', ''); setSearchInput(''); }}></i>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="filter-section">
            <div className="filter-title">Categories</div>
            <div className="filter-option"
              onClick={() => updateFilter('category', '')}
              style={{ fontWeight: !filters.category ? 700 : 400, color: !filters.category ? 'var(--kl-orange)' : 'inherit' }}>
              <span>All Categories</span>
            </div>
            {categories.map(cat => (
              <div key={cat.slug} className="filter-option"
                style={{ fontWeight: filters.category === cat.slug ? 700 : 400, color: filters.category === cat.slug ? 'var(--kl-orange)' : 'inherit' }}
                onClick={() => updateFilter('category', cat.slug)}>
                {cat.icon && <i className={`bi ${cat.icon}`}></i>}
                <span>{cat.name}</span>
                <span style={{ marginLeft: 'auto', color: '#aaa', fontSize: 12 }}>({cat.product_count})</span>
              </div>
            ))}
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

          {/* Deals */}
          <div className="filter-section">
            <div className="filter-title">Deals</div>
            <label className="filter-option">
              <input type="checkbox" checked={!!filters.flash_deals}
                onChange={e => updateFilter('flash_deals', e.target.checked ? '1' : '')} />
              <i className="bi bi-lightning-charge-fill" style={{ color: '#f85606' }}></i>
              Flash Deals
            </label>
            <label className="filter-option">
              <input type="checkbox" checked={!!filters.featured}
                onChange={e => updateFilter('featured', e.target.checked ? '1' : '')} />
              <i className="bi bi-star-fill" style={{ color: '#ffc107' }}></i>
              Featured
            </label>
          </div>

          <button onClick={clearFilters}
            style={{ width: '100%', background: 'none', border: '1px solid var(--kl-border)', borderRadius: 4, padding: '8px', fontSize: 13, cursor: 'pointer', color: 'var(--kl-gray)' }}>
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
              {activeCategory && <span style={{ color: '#888' }}> in <strong>{activeCategory.name}</strong></span>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Sort by:</span>
              <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)}
                style={{ border: '1px solid #e8e8e8', borderRadius: 4, padding: '6px 12px', fontSize: 13, outline: 'none' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <Spinner /> : (
            <>
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 4 }}>
                  <i className="bi bi-search" style={{ fontSize: 48, color: '#ddd', display: 'block', marginBottom: 12 }}></i>
                  <h3 style={{ color: '#666', marginBottom: 8 }}>No products found</h3>
                  <p style={{ color: '#aaa', fontSize: 14 }}>Try adjusting your filters or search terms.</p>
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