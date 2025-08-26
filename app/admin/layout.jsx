export default function AdminLayout({ children }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Console</h1>
      {children}
    </main>
  );
}

