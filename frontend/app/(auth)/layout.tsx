import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-black relative">
            <div className="bg-grid" />
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-20 min-h-screen">
                {children}
            </main>
            <Footer />
        </div>
    );
}
