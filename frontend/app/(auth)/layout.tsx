export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}
