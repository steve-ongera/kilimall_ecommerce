import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { useToast, Toast } from '../components/common';

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    phone:      user?.phone      || '',
    email:      user?.email      || '',
  });

  const [passwords, setPasswords] = useState({
    old_password:  '',
    new_password:  '',
    new_password2: '',
  });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      setUser(data);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.new_password2) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword(passwords);
      showToast('Password changed successfully!', 'success');
      setPasswords({ old_password: '', new_password: '', new_password2: '' });
    } catch (err) {
      const msg = err.response?.data?.old_password?.[0]
        || err.response?.data?.detail
        || 'Failed to change password.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { key: 'profile',  label: 'My Profile',       icon: 'bi-person'         },
    { key: 'password', label: 'Change Password',   icon: 'bi-lock'           },
    { key: 'orders',   label: 'My Orders',         icon: 'bi-bag'            },
  ];

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {toast && <Toast {...toast} onClose={hideToast} />}

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>
        <i className="bi bi-person-circle" style={{ color: 'var(--kl-orange)', marginRight: 10 }}></i>
        My Account
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Sidebar */}
        <aside>
          {/* Avatar card */}
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 8, padding: 20, marginBottom: 12, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--kl-orange)',
              color: 'white', fontSize: 28, fontWeight: 800, display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            }}>
              {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{user?.email}</div>
          </div>

          {/* Nav */}
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
            {TABS.map(t => (
              <div key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 16px', cursor: 'pointer', fontSize: 14,
                  borderLeft: tab === t.key ? '3px solid var(--kl-orange)' : '3px solid transparent',
                  background: tab === t.key ? '#fff5f0' : 'white',
                  color: tab === t.key ? 'var(--kl-orange)' : '#333',
                  fontWeight: tab === t.key ? 700 : 400,
                  borderBottom: '1px solid #f8f8f8',
                  transition: 'all 0.15s',
                }}>
                <i className={`bi ${t.icon}`}></i>
                {t.label}
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 8, padding: 28 }}>

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid var(--kl-orange)' }}>
                Personal Information
              </h2>
              <form onSubmit={handleProfileSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-control" value={form.first_name}
                      onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-control" value={form.last_name}
                      onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Email Address</label>
                  <input className="form-control" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" type="tel" placeholder="0712 345 678" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} disabled={saving}>
                  {saving ? 'Saving...' : <><i className="bi bi-check-lg"></i> Save Changes</>}
                </button>
              </form>
            </>
          )}

          {/* ── Password Tab ── */}
          {tab === 'password' && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid var(--kl-orange)' }}>
                Change Password
              </h2>
              <form onSubmit={handlePasswordChange} style={{ maxWidth: 420 }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Current Password</label>
                  <input className="form-control" type="password" value={passwords.old_password}
                    onChange={e => setPasswords(p => ({ ...p, old_password: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">New Password</label>
                  <input className="form-control" type="password" value={passwords.new_password}
                    onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={8} />
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-control" type="password" value={passwords.new_password2}
                    onChange={e => setPasswords(p => ({ ...p, new_password2: e.target.value }))} required minLength={8} />
                </div>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} disabled={saving}>
                  {saving ? 'Updating...' : <><i className="bi bi-lock"></i> Update Password</>}
                </button>
              </form>
            </>
          )}

          {/* ── Orders Tab ── */}
          {tab === 'orders' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="bi bi-bag" style={{ fontSize: 48, color: '#ddd', display: 'block', marginBottom: 12 }}></i>
              <p style={{ color: '#888', marginBottom: 16 }}>View your full order history</p>
              <a href="/orders">
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }}>
                  <i className="bi bi-bag"></i> Go to My Orders
                </button>
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}