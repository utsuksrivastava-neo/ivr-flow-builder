/**
 * @file AdminPage.jsx — administrator UI for listing, adding, and removing local IVR Builder accounts.
 */
import React, { useState, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import { UserPlus, Trash2, Shield, User } from 'lucide-react';

/**
 * Admin screen: manage local IVR Flow Builder accounts (add / list / delete).
 */
export default function AdminPage() {
  const usersRaw = useAuthStore((s) => s.users);
  const addUser = useAuthStore((s) => s.addUser);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const currentUser = useAuthStore((s) => s.user);

  /**
   * Public user rows (no passwords) for the table.
   */
  const users = useMemo(
    () => usersRaw.map(({ password: _pw, ...rest }) => rest),
    [usersRaw]
  );

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState(/** @type {'admin' | 'user'} */ ('user'));

  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [messageKind, setMessageKind] = useState(/** @type {'success' | 'error' | null} */ (null));

  /**
   * Clears transient feedback after a short delay.
   *
   * @param {string} text
   * @param {'success' | 'error'} kind
   */
  const showMessage = (text, kind) => {
    setMessage(text);
    setMessageKind(kind);
    window.setTimeout(() => {
      setMessage(null);
      setMessageKind(null);
    }, 4000);
  };

  /**
   * Submits the add-user form via the auth store.
   *
   * @param {React.FormEvent} e
   */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const result = await addUser(formUsername, formPassword, formName, formRole);
    if (result.success) {
      showMessage('User added successfully.', 'success');
      setFormUsername('');
      setFormPassword('');
      setFormName('');
      setFormRole('user');
    } else {
      showMessage(result.error, 'error');
    }
  };

  /**
   * Confirms and deletes a user by username.
   *
   * @param {string} username
   */
  const handleDelete = (username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const result = deleteUser(username);
    if (result.success) {
      showMessage('User removed.', 'success');
    } else {
      showMessage(result.error, 'error');
    }
  };

  return (
    <div className="admin-users-page">
      <h2 className="admin-section-title">
        <Shield size={18} />
        User Management
      </h2>
      {message && (
          <div
            className={`admin-flash ${messageKind === 'success' ? 'admin-flash-success' : 'admin-flash-error'}`}
            role="status"
          >
            {message}
          </div>
        )}

        <div className="admin-add-form">
          <h2 className="admin-section-title">
            <UserPlus size={18} />
            Add User
          </h2>
          <form className="admin-form-grid" onSubmit={handleAddSubmit}>
            <label className="admin-field">
              <span>Username</span>
              <input
                type="text"
                className="admin-input"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="admin-field">
              <span>Password</span>
              <input
                type="password"
                className="admin-input"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="admin-field">
              <span>Name</span>
              <input
                type="text"
                className="admin-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="admin-field">
              <span>Role</span>
              <select
                className="admin-input admin-select"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value === 'admin' ? 'admin' : 'user')}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="toolbar-btn primary">
                <UserPlus size={14} />
                <span>Add User</span>
              </button>
            </div>
          </form>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.username}>
                  <td>{u.username}</td>
                  <td>{u.name}</td>
                  <td>
                    <span className={`admin-role-badge ${u.role}`}>
                      {u.role === 'admin' ? (
                        <>
                          <Shield size={12} /> Admin
                        </>
                      ) : (
                        <>
                          <User size={12} /> User
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    {u.username !== currentUser?.username && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.username)}
                        className="config-btn-icon danger"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
