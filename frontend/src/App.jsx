import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { OrdersPage, OrderDetailPage } from './pages/OrderPages';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute><div className="container" style={{paddingTop:40}}>Wishlist page</div></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><div className="container" style={{paddingTop:40}}>Account page</div></ProtectedRoute>} />
              <Route path="*" element={
                <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: 52, color: '#f85606', display: 'block', marginBottom: 12 }}></i>
                  <h1 style={{ fontSize: 48, fontWeight: 800, color: '#f85606' }}>404</h1>
                  <p style={{ fontSize: 18, color: '#666', marginBottom: 20 }}>Page not found</p>
                  <a href="/"><button style={{ background: '#f85606', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 4, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Go Home</button></a>
                </div>
              } />
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;