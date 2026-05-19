import PageShell from "../components/PageShell";

export default function UserPage() {
  return (
    <PageShell>
      <div className="inventory-container">
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage your account
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: 0,
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          Update your personal details and keep your account secure.
        </p>
        <div className="inventory-list">
          <div className="inventory-item">
            <div>
              <h1 className="inventory-title">Change password</h1>
              <p className="inventory-subtitle">
                Update your password to keep your account protected.
              </p>
            </div>
          </div>
          <div className="inventory-item">
            <div>
              <h1 className="inventory-title">Update contact details</h1>
              <p className="inventory-subtitle">
                Review or change your email and phone number.
              </p>
            </div>
          </div>
          <div className="inventory-item">
            <div>
              <h1 className="inventory-title">Session &amp; device activity</h1>
              <p className="inventory-subtitle">
                See where you&apos;re signed in and manage active sessions.
              </p>
            </div>
          </div>
          <div className="inventory-item">
            <div>
              <h1 className="inventory-title">Notification preferences</h1>
              <p className="inventory-subtitle">
                Decide what alerts you want to receive from CoolSync.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
