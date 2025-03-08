import Navbar from "../components/Navbar";

const Layout = ({ children }) => {
  return (
    <div className="h-screen w-full">
      <Navbar />
      <main className="h-full">{children}</main>
    </div>
  );
};

export default Layout;
